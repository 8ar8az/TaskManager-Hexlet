import Router from 'koa-router';

const router = new Router();

router.get('root', '/', (ctx) => {
  ctx.body = 'Hello, World!!!';
});

export default router;
