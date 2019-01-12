export default models => async (ctx, next) => {
  ctx.state.flash = ctx.flash;

  const user = await models.User.findByPk(ctx.session.userId);

  if (!user) {
    await next();
    return;
  }

  if (user.isActive) {
    ctx.state.currentUser = user;
  } else {
    ctx.state.restorableUser = user;
  }

  await next();
};
