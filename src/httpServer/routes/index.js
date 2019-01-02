import Router from 'koa-router';
import _ from 'lodash';
import addSessionRoutes from './session';
import addUserRoutes from './users';
import addTaskStatusesRoutes from './task-statuses';
import addTasksRoutes from './tasks';

const addRoutesFunctions = [addSessionRoutes, addUserRoutes, addTaskStatusesRoutes, addTasksRoutes];

const pageTitles = {
  index: 'Главная',
};

export default (models, logger) => {
  const router = new Router();

  router.get('index', '/', (ctx) => {
    ctx.render('index', { pageTitle: pageTitles.index });
  });

  _.forEach(addRoutesFunctions, (addRoutes) => {
    addRoutes(router, models, logger);
  });

  logger.initializationLog('HTTP-routes have been init: %o', _.sortedUniq(_.map(router.stack, 'path')));
  return router;
};
