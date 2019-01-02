import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';
import checkResourceIsExistAndGetInstance from '../middlwares/resource-exist-check';
import checkUserPermission, { isSameUser } from '../middlwares/check-user-permission';
import { userSignIn, clearSession } from './session';

const pageTitles = {
  index: 'Список пользователей',
  newUser: 'Регистрация нового пользователя',
  myProfile: 'Мои профиль',
  userProfile: userName => `Профиль пользователя '${userName}'`,
  restoreUser: 'Восстановление аккаунта',
};

const flashMessages = {
  createdUser: email => `Пользователь с email: '${email}' успешно создан и вы автоматически вошли в систему`,
  updatedUser: 'Ваши данные успешно обновлены',
  deletedUser: email => `Пользователь с email: '${email}' успешно удален из системы`,
  restoredUser: email => `Пользователь с email: '${email}' успешно восстановлен в системе. Вы можете аутентифицироваться`,
};

export default (router, models, logger) => {
  router.get('usersIndex', '/users', async (ctx) => {
    const usersList = await models.User.findAll();
    const viewData = { pageTitle: pageTitles.index, usersList };
    ctx.render('users/index', viewData);
  });

  router.get('newUser', '/users/new', (ctx) => {
    const viewData = {
      pageTitle: pageTitles.newUser,
      errors: [],
      formData: {},
      isEditableForm: true,
    };
    ctx.render('users/new', viewData);
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
        const viewData = { pageTitle: pageTitles.newUser, isEditableForm: true };
        renderFormErrors(ctx, err.errors, 'users/new', viewData);
        return;
      }
      throw err;
    }

    userSignIn(ctx, newUser);
    logger.mainProcessLog("%s | %s | User with email: '%s' has been created", ctx.method, ctx.url, email);
    ctx.flash = { message: flashMessages.createdUser(newUser.email) };
    makeRedirect(ctx, router.url('index'));
  });

  router.get(
    'usersEdit',
    '/users/:id/edit',
    checkResourceIsExistAndGetInstance(models.User.scope('active'), logger),
    async (ctx) => {
      const viewData = {
        pageTitle: isSameUser(ctx.state.currentUser, ctx.state.resourceInstance)
          ? pageTitles.myProfile : pageTitles.userProfile(ctx.state.resourceInstance.fullName),
        errors: [],
        formData: ctx.state.resourceInstance.get(),
        isEditableForm: isSameUser(
          ctx.state.currentUser,
          ctx.state.resourceInstance,
        ),
      };
      ctx.render('users/edit', viewData);
    },
  );

  router.patch(
    'user',
    '/users/:id',
    checkResourceIsExistAndGetInstance(models.User.scope('active'), logger),
    checkUserPermission('user', 'PATCH', logger),
    async (ctx) => {
      logger.mainProcessLog('%s | %s | Updating user:\n%O', ctx.method, ctx.url, ctx.state.resourceInstance.get());
      try {
        await ctx.state.resourceInstance.update(ctx.request.body);
      } catch (err) {
        if (err instanceof ctx.state.resourceInstance.sequelize.ValidationError) {
          logger.mainProcessLog('%s | %s | User %o has not been updated. Form data is invalid', ctx.method, ctx.url, ctx.state.resourceInstance.get());
          const viewData = {
            pageTitle: pageTitles.myProfile,
            isEditableForm: true,
          };
          renderFormErrors(ctx, err.errors, 'users/edit', viewData);
          return;
        }
        throw err;
      }

      await ctx.state.resourceInstance.reload();
      logger.mainProcessLog('%s | %s | User %o has been updated', ctx.method, ctx.url, ctx.state.resourceInstance.get());
      ctx.flash = { message: flashMessages.updatedUser };
      makeRedirect(ctx, router.url('usersEdit', { id: ctx.state.resourceInstance.id }));
    },
  );

  router.delete(
    '/users/:id',
    checkResourceIsExistAndGetInstance(models.User.scope('active'), logger),
    checkUserPermission('user', 'DELETE', logger),
    async (ctx) => {
      logger.mainProcessLog('%s | %s | Deleting user:\n%O', ctx.method, ctx.url, ctx.state.resourceInstance.get());
      ctx.state.resourceInstance.delete();
      await ctx.state.resourceInstance.save();

      clearSession(ctx);

      logger.mainProcessLog('%s | %s | User has been updated. Session was cleared', ctx.method, ctx.url);
      ctx.flash = { message: flashMessages.deletedUser(ctx.state.resourceInstance.email) };
      makeRedirect(ctx, router.url('index'));
    },
  );

  router.get(
    'userQueryToRestore',
    '/users/deleted/:id/restore',
    checkResourceIsExistAndGetInstance(models.User.scope('deleted'), logger),
    checkUserPermission('userRestoreQuery', 'GET', logger),
    async (ctx) => {
      const viewData = { pageTitle: pageTitles.restoreUser };
      ctx.render('users/query-to-restore', viewData);
    },
  );

  router.patch(
    'userRestore',
    '/users/deleted/:id',
    checkResourceIsExistAndGetInstance(models.User.scope('deleted'), logger),
    checkUserPermission('userRestore', 'PATCH', logger),
    async (ctx) => {
      logger.mainProcessLog('%s | %s | Restoring user:\n%O', ctx.method, ctx.url, ctx.state.resourceInstance.get());
      ctx.state.resourceInstance.restore();
      await ctx.state.resourceInstance.save();

      clearSession(ctx);

      logger.mainProcessLog('%s | %s | User has been restored. Session was cleared', ctx.method, ctx.url);
      ctx.flash = { message: flashMessages.restoredUser(ctx.state.resourceInstance.email) };
      makeRedirect(ctx, router.url('index'));
    },
  );
};
