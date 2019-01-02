export default (ctx, url) => {
  ctx.status = 303;
  ctx.redirect(url);
  ctx.body = `Перенаправление на адрес: ${url}`;
};
