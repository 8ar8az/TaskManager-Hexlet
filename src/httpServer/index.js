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
import _ from 'lodash';
import getErrorHandlingMiddleware from './middlwares/error-handling';

export default ({
  router,
  sessionParseMiddleware,
  sessionConfig,
  reportAboutError,
  logger,
}) => {
  const staticFilesPath = path.resolve(__dirname, '..', '..', 'public');

  const koaBodyConfig = {
    text: false,
    json: false,
  };

  const pugConfig = {
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

  app.use(getErrorHandlingMiddleware(logger));
  app.use(koaLogger());
  app.use(serve(staticFilesPath));
  app.use(session(sessionConfig));
  app.use(flash());
  app.use(sessionParseMiddleware);
  app.use(koaBody(koaBodyConfig));
  app.use(methodoverride('_method'));
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(async (ctx) => {
    ctx.throw(404);
  });

  pug.use(app);

  app.on('error', (err, ctx) => {
    logger.errorReportingLog('Reporting about uncaught error:\n%O', err);
    reportAboutError(err, ctx.request);
  });

  const httpServer = http.createServer(app.callback());
  return httpServer;
};
