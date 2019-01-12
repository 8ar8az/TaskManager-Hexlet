import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';
import { clearSession } from './session';
import getAuthorizationMiddleware, { isSameUser } from '../middlwares/authtorization';

export default (router, models) => {
  const getMiddlewareForGettingRequestedUser = model => async (ctx, next) => {
    ctx.user = await model.findByPk(ctx.params.id, { rejectOnEmpty: true });
    await next();
  };

  router.get('usersIndex', '/users', async (ctx) => {
    const users = await models.User.scope('active').findAll();
    const viewData = { pageTitle: ctx.t('page-titles:users.index'), users };
    ctx.render('users/index', viewData);
  });

  router.get('usersNew', '/users/new', (ctx) => {
    const user = models.User.build();

    const viewData = {
      pageTitle: ctx.t('page-titles:users.new'),
      errors: [],
      user,
    };

    ctx.render('users/new', viewData);
  });

  router.post('/users', async (ctx) => {
    const user = models.User.build(ctx.request.body);

    try {
      await user.save();

      ctx.flash = { message: ctx.t('flash-messages:users.create', { user }) };
      makeRedirect(ctx, router.url('index'));
    } catch (err) {
      if (!(err instanceof user.sequelize.ValidationError)) {
        throw err;
      }

      const viewData = { pageTitle: ctx.t('page-titles:users.new'), user };
      renderFormErrors(ctx, err.errors, 'users/new', viewData);
    }
  });

  router.get(
    'usersProfile',
    '/users/:id',
    getMiddlewareForGettingRequestedUser(models.User.scope('active')),
    async (ctx) => {
      const { currentUser } = ctx.state;
      const { user } = ctx;

      const viewData = {
        pageTitle: isSameUser(currentUser, user)
          ? ctx.t('page-titles:users.profile.my') : ctx.t('page-titles:users.profile.user', { user }),
        errors: [],
        user,
        isSameUser,
      };

      ctx.render('users/profile', viewData);
    },
  );

  router.patch(
    '/users/:id',
    getMiddlewareForGettingRequestedUser(models.User.scope('active')),
    getAuthorizationMiddleware('usersProfile'),
    async (ctx) => {
      const { user } = ctx;

      const fieldsForUpdate = ['firstname', 'lastname', 'email'];
      try {
        await user.update(
          ctx.request.body,
          { fields: ctx.request.body.password ? fieldsForUpdate.concat('password') : fieldsForUpdate },
        );

        ctx.flash = { message: ctx.t('flash-messages:users.update') };
        makeRedirect(ctx, router.url('usersProfile', { id: user.id }));
      } catch (err) {
        if (!(err instanceof user.sequelize.ValidationError)) {
          throw err;
        }

        const viewData = {
          pageTitle: ctx.t('page-titles:users.profile.my'),
          user,
          isSameUser,
        };
        renderFormErrors(ctx, err.errors, 'users/profile', viewData);
      }
    },
  );

  router.delete(
    '/users/:id',
    getMiddlewareForGettingRequestedUser(models.User.scope('active')),
    getAuthorizationMiddleware('usersProfile'),
    async (ctx) => {
      const { user } = ctx;

      user.delete();
      await user.save();

      clearSession(ctx);

      ctx.flash = { message: ctx.t('flash-messages:users.delete', { user }) };
      makeRedirect(ctx, router.url('index'));
    },
  );

  router.get(
    'usersQueryToRestore',
    '/users/deleted/:id/restore',
    getMiddlewareForGettingRequestedUser(models.User.scope('deleted')),
    getAuthorizationMiddleware('usersQueryToRestore'),
    async (ctx) => {
      const viewData = { pageTitle: ctx.t('page-titles:users.restore') };
      ctx.render('users/query-to-restore', viewData);
    },
  );

  router.patch(
    'usersRestore',
    '/users/deleted/:id',
    getMiddlewareForGettingRequestedUser(models.User.scope('deleted')),
    getAuthorizationMiddleware('usersRestore'),
    async (ctx) => {
      const { user } = ctx;

      user.restore();
      await user.save();

      clearSession(ctx);

      ctx.flash = { message: ctx.t('flash-messages:users.restore', { user }) };
      makeRedirect(ctx, router.url('index'));
    },
  );
};
