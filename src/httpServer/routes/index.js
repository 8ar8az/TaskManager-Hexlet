import Router from 'koa-router';
import _ from 'lodash';
import addSessionRoutes from './session';
import addUserRoutes from './users';

const addRoutesFunctions = [addSessionRoutes, addUserRoutes];

export default (models, logger) => {
  const router = new Router();

  router.get('root', '/', (ctx) => {
    ctx.render('index', { pageTitle: 'Главная' });
  });

  _.forEach(addRoutesFunctions, (addRoutes) => {
    addRoutes(router, models, logger);
  });

  logger.initializationLog('HTTP-routes have been init: %o', _.sortedUniq(_.map(router.stack, 'path')));
  return router;
};
