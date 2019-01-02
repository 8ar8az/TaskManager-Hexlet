export default (resourceModel, logger) => async (ctx, next) => {
  const { id } = ctx.params;
  const resourceInstance = await resourceModel.findByPk(id, { include: [{ all: true }] });
  if (!resourceInstance) {
    logger.mainProcessLog("%s | %s | Instance for requested resource with id: '%s' is not exist", ctx.method, ctx.url, id);
    ctx.throw(404);
  }

  logger.mainProcessLog("%s | %s | Instance for requested resource with id: '%s' has been found. Instance:\n%O", ctx.method, ctx.url, id, resourceInstance);
  ctx.state.resourceInstance = resourceInstance;
  await next();
};
