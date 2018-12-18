const errorMessages = {
  404: 'Ресурс не найден',
  403: 'Отсутствует доступ',
  500: 'Что-то пошло не так',
};

export default logger => async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (!err.status) {
      logger.mainProcessLog('%s | %s | Error occured:\n%O', ctx.method, ctx.url, err);
      ctx.app.emit('error', err, ctx);
    }

    ctx.status = err.status || 500;
    ctx.render(`errors/${ctx.status}`, { pageTitle: errorMessages[ctx.status] });
  }
};
