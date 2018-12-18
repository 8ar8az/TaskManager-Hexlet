import makeRedirect from './utils/redirect';
import renderFormErrors from './utils/form-errors-render';
import { userSignIn, clearSession } from './session';

const newUserPageTitle = 'Регистрация нового пользователя';

const canUserModifyResource = (resourceOwner, user) => (!!user && (user.id === resourceOwner.id));

export default (router, models, logger) => {
  const checkUserResourceIsExistAndGetOwner = usersScope => async (ctx, next) => {
    const { userId } = ctx.params;
    const userForRequestedResource = await usersScope.findById(userId);
    if (!userForRequestedResource) {
      logger.mainProcessLog("%s | %s | User-resource with id: '%s' is not exist", ctx.method, ctx.url, userId);
      ctx.throw(404);
    }

    ctx.state.resourceOwner = userForRequestedResource;
    logger.mainProcessLog("%s | %s | User-resource with id: '%s' is found. Owner for resource:\n%O", ctx.method, ctx.url, userId, userForRequestedResource.get());
    await next();
  };

  const checkUserPermissionForResource = userType => async (ctx, next) => {
    const userForCheckPermission = ctx.state[userType];
    if (!canUserModifyResource(ctx.state.resourceOwner, userForCheckPermission)) {
      logger.mainProcessLog("%s | %s | User %o don't have permission for interact with requested resource", ctx.method, ctx.url, userForCheckPermission ? userForCheckPermission.get() : null);
      ctx.throw(403);
    }

    logger.mainProcessLog('%s | %s | User %o can interact with requested resource', ctx.method, ctx.url, userForCheckPermission.get());
    await next();
  };

  router.get('allUsers', '/users', async (ctx) => {
    const usersList = await models.User.scope('active').findAll();
    const viewData = { pageTitle: 'Список пользователей', usersList };
    ctx.render('user/users-list', viewData);
  });

  router.get('newUser', '/users/new', (ctx) => {
    const viewData = {
      pageTitle: newUserPageTitle,
      errors: [],
      formData: {},
      isEditableForm: true,
    };
    ctx.render('user/user-registration', viewData);
  });

  router.post('/users', async (ctx) => {
    const { email } = ctx.request.body;
    logger.mainProcessLog("%s | %s | Creating user with email: '%s'", ctx.method, ctx.url, email);
    const newUser = models.User.build(ctx.request.body);

    try {
      await newUser.save();
    } catch (err) {
      if (err instanceof newUser.sequelize.ValidationError) {
        logger.mainProcessLog("%s | %s | User with email: '%s' has not been created. Form data is invalid", ctx.method, ctx.url, email);
        const viewData = { pageTitle: newUserPageTitle, isEditableForm: true };
        renderFormErrors(ctx, err.errors, 'user/user-registration', viewData);
        return;
      }
      throw err;
    }

    userSignIn(ctx, newUser);
    logger.mainProcessLog("%s | %s | User with email: '%s' has been created", ctx.method, ctx.url, email);
    ctx.flash = { message: `Пользователь с email: '${newUser.email}' был успешно создан и вы автоматически вошли в систему под этим аккаунтом` };
    makeRedirect(ctx, router.url('root'));
  });

  router.get(
    'userProfile',
    '/users/:userId/edit',
    checkUserResourceIsExistAndGetOwner(models.User.scope('active')),
    async (ctx) => {
      const viewData = {
        pageTitle: canUserModifyResource(ctx.state.resourceOwner, ctx.state.currentUser) ? 'Мои настройки' : `Профиль пользователя ${ctx.state.resourceOwner.fullName}`,
        errors: [],
        formData: ctx.state.resourceOwner.get(),
        isEditableForm: canUserModifyResource(ctx.state.resourceOwner, ctx.state.currentUser),
      };
      ctx.render('user/user-profile', viewData);
    },
  );

  router.put(
    'user',
    '/users/:userId',
    checkUserResourceIsExistAndGetOwner(models.User.scope('active')),
    checkUserPermissionForResource('currentUser'),
    async (ctx) => {
      logger.mainProcessLog('%s | %s | Updating user:\n%O', ctx.method, ctx.url, ctx.state.resourceOwner.get());
      try {
        await ctx.state.resourceOwner.update(ctx.request.body);
      } catch (err) {
        if (err instanceof ctx.state.resourceOwner.sequelize.ValidationError) {
          logger.mainProcessLog('%s | %s | User %o has not been updated. Form data is invalid', ctx.method, ctx.url, ctx.state.resourceOwner.get());
          const viewData = {
            pageTitle: 'Мои настройки',
            isEditableForm: true,
          };
          renderFormErrors(ctx, err.errors, 'user/user-profile', viewData);
          return;
        }
        throw err;
      }

      await ctx.state.resourceOwner.reload();
      logger.mainProcessLog('%s | %s | User %o has been updated', ctx.method, ctx.url, ctx.state.resourceOwner.get());
      ctx.flash = { message: 'Данные пользователя успешно обновлены' };
      makeRedirect(ctx, router.url('userProfile', { userId: ctx.state.resourceOwner.id }));
    },
  );

  router.delete(
    '/users/:userId',
    checkUserResourceIsExistAndGetOwner(models.User.scope('active')),
    checkUserPermissionForResource('currentUser'),
    async (ctx) => {
      logger.mainProcessLog('%s | %s | Deleting user:\n%O', ctx.method, ctx.url, ctx.state.resourceOwner.get());
      ctx.state.resourceOwner.delete();
      await ctx.state.resourceOwner.save();

      clearSession(ctx);

      logger.mainProcessLog('%s | %s | User has been updated. Session was cleared', ctx.method, ctx.url);
      ctx.flash = { message: `Пользователь с email: '${ctx.state.resourceOwner.email}' успешно удален из системы` };
      makeRedirect(ctx, router.url('root'));
    },
  );

  router.get(
    'userRestoreConfirmation',
    '/users/deleted/:userId/restore',
    checkUserResourceIsExistAndGetOwner(models.User.scope('deleted')),
    checkUserPermissionForResource('userForRestore'),
    async (ctx) => {
      const viewData = { pageTitle: 'Восстановление аккаунта' };
      ctx.render('user/user-restore', viewData);
    },
  );

  router.patch(
    'userRestore',
    '/users/deleted/:userId',
    checkUserResourceIsExistAndGetOwner(models.User.scope('deleted')),
    checkUserPermissionForResource('userForRestore'),
    async (ctx) => {
      logger.mainProcessLog('%s | %s | Restoring user:\n%O', ctx.method, ctx.url, ctx.state.resourceOwner.get());
      ctx.state.resourceOwner.restore();
      await ctx.state.resourceOwner.save();

      clearSession(ctx);

      logger.mainProcessLog('%s | %s | User has been restored. Session was cleared', ctx.method, ctx.url);
      ctx.flash = { message: `Пользователь с email: '${ctx.state.resourceOwner.email}' успешно восстановлен в системе. Вы можете аутентифицироваться` };
      makeRedirect(ctx, router.url('root'));
    },
  );
};
