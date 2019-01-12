export default (sequelize, errorReporting, logger) => async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof sequelize.EmptyResultError) {
      err.status = 404;
    }

    if (!err.status) {
      logger.log('Error has been occured:\n%O', err);
      errorReporting(err, ctx.request);
    }

    ctx.status = err.status || 500;
    ctx.render(`errors/${ctx.status}`, { pageTitle: ctx.t(`page-titles:errors.${ctx.status}`) });
  }
};
