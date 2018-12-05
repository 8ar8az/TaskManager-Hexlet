import Koa from 'koa';
import koaLogger from 'koa-logger';

export default ({ routing, errorReporting }) => {
  const app = new Koa();

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      errorReporting(err, ctx.request);
    }
  });

  app.use(koaLogger());

  app.use(routing.routes());
  app.use(routing.allowedMethods());

  return app;
};
