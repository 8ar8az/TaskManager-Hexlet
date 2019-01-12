import path from 'path';
import http from 'http';
import Koa from 'koa';
import koaLogger from 'koa-logger';
import koaBody from 'koa-body';
import serve from 'koa-static';
import session from 'koa-session2';
import Pug from 'koa-pug';
import methodoverride from 'koa-methodoverride';
import flash from 'koa-flash';
import koaI18next from 'koa-i18next';
import _ from 'lodash';

import getErrorHandlingMiddleware from './middlwares/error-handling';
import getSessionParseMiddleware from './middlwares/session-parse';

export default ({
  router,
  sequelize,
  models,
  httpSessionConfig,
  logger,
  errorReporting,
  i18next,
}) => {
  const staticFilesPath = path.resolve(__dirname, '..', '..', 'public');

  const koaBodyConfig = {
    text: false,
    json: false,
  };

  const pugConfig = {
    debug: true,
    viewPath: path.resolve(__dirname, '..', '..', 'views'),
    noCache: process.env.NODE_ENV !== 'production',
    basedir: path.resolve(__dirname, '..', '..', 'views', 'layouts'),
    helperPath: [
      { getNamedURL: router.url.bind(router) },
      { _ },
    ],
  };

  const app = new Koa();
  const pug = new Pug(pugConfig);

  app.keys = [process.env.SECRET_KEY || 'abcdef'];

  app.use(koaLogger());
  app.use(koaI18next(i18next, { next: true }));
  app.use(getErrorHandlingMiddleware(sequelize, errorReporting, logger));
  app.use(serve(staticFilesPath));
  app.use(koaBody(koaBodyConfig));
  app.use(async (ctx, next) => {
    logger.log('Request body: %o', ctx.request.body);
    await next();
  });
  app.use(methodoverride('_method'));
  app.use(session(httpSessionConfig));
  app.use(flash());
  app.use(getSessionParseMiddleware(models));
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(async (ctx) => {
    ctx.throw(404);
  });

  pug.use(app);

  const httpServer = http.createServer(app.callback());
  return httpServer;
};
