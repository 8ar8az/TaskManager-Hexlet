import Bottle from 'bottlejs';
import Sequelize from 'sequelize';
import dotenv from 'dotenv';
import _ from 'lodash';

import modelsInitializators from './models';
import getRollbarReporting from './lib/rollbar';
import getI18next from './lib/i18next';
import logger from './lib/logger';
import dbConfig from './config/config';
import initHttpServer from './httpServer';
import getRouter from './httpServer/routes';
import getSessionConfig from './httpServer/middlwares/httpSession/session-config';
import getUmzug from './lib/umzug';

dotenv.config({ debug: true });

export default () => {
  logger.log('Task-manager server is loading...');

  const bottle = new Bottle();

  bottle.constant('logger', logger);

  bottle.factory('i18next', async () => getI18next());

  bottle.factory('sequelize', async () => {
    const databaseConfig = dbConfig[process.env.NODE_ENV];
    logger.log('Connecting to database with config:\n%O', databaseConfig);

    const sequelize = new Sequelize(
      databaseConfig.database_url,
      { ...databaseConfig, logging: (log) => { logger.dbLog(log); } },
    );
    logger.log('Database is connected. Executing migrations...');

    const umzug = getUmzug(sequelize);
    const executedMigrations = await umzug.up();

    logger.log('Migrations have been executed: %o', _.map(executedMigrations, 'file'));

    return sequelize;
  });

  bottle.factory('models', async (container) => {
    const sequelize = await container.sequelize;
    const i18next = await container.i18next;
    logger.log('ORM models is initializing...');

    const models = _.reduce(_.keys(modelsInitializators), (acc, modelName) => {
      const modelInitializator = modelsInitializators[modelName];
      const model = sequelize.import(modelName, modelInitializator(i18next));
      return { ...acc, [modelName]: model };
    }, {});

    logger.log('ORM models have been init: %o', _.keys(models));

    models.TaskStatus.defaultValue = await models.TaskStatus.findOne({ where: { name: i18next.t('common:systemTaskStatuses.new') } });
    logger.log("Default value for task's status ORM model has been init");

    _.forEach(models, (model) => {
      model.associate(models);
    });
    logger.log('ORM models have been associated each other');

    return models;
  });

  bottle.factory('httpSessionConfig', async (container) => {
    const sequelize = await container.sequelize;
    logger.log('HTTP-session config is forming...');

    return getSessionConfig(sequelize, logger);
  });

  bottle.factory('errorReporting', () => {
    logger.log('Error reporter has been init');
    return getRollbarReporting();
  });

  bottle.factory('router', async (container) => {
    const models = await container.models;
    logger.log('HTTP-routes is initializing...');

    return getRouter(models, logger);
  });

  bottle.factory('httpServer', async (container) => {
    const sequelize = await container.sequelize;
    const models = await container.models;
    const router = await container.router;
    const httpSessionConfig = await container.httpSessionConfig;
    const i18next = await container.i18next;
    const { errorReporting } = container;

    logger.log('HTTP-server is initializing...');

    const server = initHttpServer({
      router,
      sequelize,
      models,
      httpSessionConfig,
      errorReporting,
      logger,
      i18next,
    });

    logger.log('HTTP-server has been successful init');
    logger.log('Task-manager has been loading');

    const httpServer = {
      async start(...args) {
        await sequelize.sync();
        server.listen(...args);
        logger.log('Task-manager has been started');
      },
      async close(...args) {
        await sequelize.close();
        server.close(...args);
        logger.log('Task-manager has been closed');
      },
      getRequestHandler() {
        return server;
      },
    };

    return httpServer;
  });

  return bottle.container;
};
