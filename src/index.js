import Bottle from 'bottlejs';
import Sequelize from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import getRollbarReporting from './lib/rollbar';
import appLogger from './lib/logger';
import dbConfig from './config/config';
import initHttpServer from './httpServer';
import getSessioParseMiddleware from './httpServer/middlwares/session-parse';
import getRouter from './httpServer/routes';
import getSessionConfig from './httpServer/middlwares/httpSession/session-config';
import getUmzug from './lib/umzug';

dotenv.config();

export default () => {
  appLogger.initializationLog('Task-manager server is loading...');

  const bottle = new Bottle();

  bottle.constant('logger', appLogger);

  bottle.factory('database', async ({ logger }) => {
    const databaseConfig = dbConfig[process.env.NODE_ENV];
    logger.initializationLog('Connecting to database with configuration:\n%O', databaseConfig);

    const databaseArgs = _.compact([
      process.env.DATABASE_URL,
      { ...databaseConfig, logging: (log) => { logger.databaseLog(log); } },
    ]);

    const sequelize = new Sequelize(...databaseArgs);
    logger.initializationLog('Database is connected. Executing migrations...');

    const umzug = getUmzug(sequelize);
    const executedMigrations = await umzug.up();
    logger.initializationLog('Migrations have been executed: %o', _.map(executedMigrations, 'file'));

    return sequelize;
  });

  bottle.factory('models', async (container) => {
    const { logger } = container;
    const database = await container.database;
    logger.initializationLog('ORM models is initializing...');

    const pathToModels = path.resolve(__dirname, 'models');
    const modelsFiles = fs.readdirSync(pathToModels);

    const models = _.reduce(modelsFiles, (acc, file) => {
      const { name } = path.parse(file);
      const pathToModel = path.resolve(pathToModels, name);
      const model = database.import(pathToModel);

      return { ...acc, [name]: model };
    }, {});
    logger.initializationLog('ORM models have been init: %o', _.keys(models));

    return models;
  });

  bottle.factory('sessionConfig', async (container) => {
    const { logger } = container;
    const database = await container.database;
    logger.initializationLog("User's HTTP-session module is initializing...");

    return getSessionConfig(database, logger);
  });

  bottle.factory('reportAboutError', ({ logger }) => {
    logger.initializationLog('Error reporter is initializing...');

    return getRollbarReporting(logger);
  });

  bottle.factory('sessionParseMiddleware', async (container) => {
    const { logger } = container;
    const models = await container.models;
    logger.initializationLog('Session parsing middleware is initializing...');

    return getSessioParseMiddleware(models, logger);
  });

  bottle.factory('router', async (container) => {
    const { logger } = container;
    const models = await container.models;
    logger.initializationLog('HTTP-routes is initializing...');

    return getRouter(models, logger);
  });

  bottle.factory('httpServer', async (container) => {
    const database = await container.database;
    const router = await container.router;
    const sessionConfig = await container.sessionConfig;
    const sessionParseMiddleware = await container.sessionParseMiddleware;
    const { logger, reportAboutError } = container;

    logger.initializationLog('HTTP-server is initializing...');

    const server = initHttpServer({
      logger,
      router,
      sessionConfig,
      sessionParseMiddleware,
      reportAboutError,
    });

    logger.initializationLog('HTTP-server has been successful init');
    logger.initializationLog('Task-manager has been loading');

    const httpServer = {
      start(...args) {
        logger.mainProcessLog('Task-manager is starting...');
        server.listen(...args);
      },
      async close(...args) {
        logger.mainProcessLog('Task-manager is closing...');
        await database.close();
        server.close(...args);
      },
      getRequestHandler() {
        return server;
      },
    };

    return httpServer;
  });

  return bottle.container;
};
