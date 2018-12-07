import Koa from 'koa';
import koaLogger from 'koa-logger';
import serve from 'koa-static';
import Pug from 'koa-pug';
import path from 'path';

export default ({ routing, errorReporting }) => {
  const pugConfig = {
    viewPath: path.resolve(__dirname, '..', 'views'),
    noCache: process.env.NODE_ENV !== 'production',
    basedir: path.resolve(__dirname, '..', 'views', 'layouts'),
    helperPath: [
      { getNamedURL: routing.url.bind(routing) },
    ],
  };

  const app = new Koa();

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      errorReporting(err, ctx.request);
    }
  });

  app.use(koaLogger());
  app.use(serve(path.resolve(__dirname, '..', 'public')));

  const pug = new Pug(pugConfig);
  pug.use(app);

  app.use(routing.routes());
  app.use(routing.allowedMethods());

  return app;
};
