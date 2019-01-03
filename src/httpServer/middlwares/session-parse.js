export default (models, logger) => {
  logger.initializationLog('Session parse middleware has been init');

  return async (ctx, next) => {
    ctx.state.flash = ctx.flash;

    const user = await models.User.findByPk(ctx.session.userId);

    if (!user) {
      logger.mainProcessLog('%s | %s | Session without user', ctx.method, ctx.url);
      await next();
      return;
    }

    if (user.isActive) {
      ctx.state.currentUser = user;
      logger.mainProcessLog('%s | %s | Current user for session:\n%O', ctx.method, ctx.url, user.get());
    } else {
      ctx.state.restorableUser = user;
      logger.mainProcessLog('%s | %s | Restorable user for session:\n%O', ctx.method, ctx.url, user.get());
    }

    await next();
  };
};
