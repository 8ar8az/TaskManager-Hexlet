import Router from 'koa-router';

const router = new Router();

router.get('root', '/', (ctx) => {
  ctx.render('index', { pageTitle: 'Менеджер задач' });
});

export default router;
