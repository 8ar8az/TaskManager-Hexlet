import _ from 'lodash';
import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';
import checkUserPermissions from './helpers/check-user-permission';
import { userSignIn, clearSession } from './session';

const pageTitles = {
  index: 'Список пользователей',
  newUser: 'Регистрация нового пользователя',
  myProfile: 'Мои профиль',
  userProfile: userName => `Профиль пользователя '${userName}'`,
  restoreUser: 'Восстановление аккаунта',
};

export default (router, models, logger) => {
  const findRequestedUser = async (ctx, usersScope) => {
    const { id } = ctx.params;

    logger.mainProcessLog("%s | %s | Find requested user with id: '%s'", ctx.method, ctx.url, id);

    const requestedUser = await usersScope.findByPk(id);
    if (!requestedUser) {
      logger.mainProcessLog("%s | %s | Requested user with id: '%s' has not been found", ctx.method, ctx.url, id);
      ctx.throw(404);
    }

    return requestedUser;
  };

  router.get('usersIndex', '/users', async (ctx) => {
    const usersList = await models.User.scope('active').findAll();
    const viewData = { pageTitle: pageTitles.index, usersList };
    ctx.render('users/index', viewData);
  });

  router.get('newUser', '/users/new', (ctx) => {
    const viewData = {
      pageTitle: pageTitles.newUser,
      errors: [],
      formData: {},
      editPermission: true,
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
      if (!(err instanceof newUser.sequelize.ValidationError)) {
        throw err;
      }
      logger.mainProcessLog("%s | %s | User with email: '%s' has not been created. Form data is invalid:\n%O", ctx.method, ctx.url, email, err);

      const viewData = { pageTitle: pageTitles.newUser, editPermission: true };
      renderFormErrors(ctx, err.errors, 'users/new', viewData);
      return;
    }

    userSignIn(ctx, newUser);

    logger.mainProcessLog("%s | %s | User with email: '%s' has been created", ctx.method, ctx.url, email);

    ctx.flash = { message: `Пользователь с email: '${email}' успешно создан и вы автоматически вошли в систему` };
    makeRedirect(ctx, router.url('index'));
  });

  router.get(
    'userProfile',
    '/users/:id',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const requestedUser = await findRequestedUser(ctx, models.User.scope('active'));
      const editPermission = checkUserPermissions
        .canUserModifyUserData(currentUser, requestedUser);

      const viewData = {
        pageTitle: editPermission
          ? pageTitles.myProfile : pageTitles.userProfile(requestedUser.fullName),
        errors: [],
        formData: requestedUser.get(),
        editPermission,
      };
      ctx.render('users/profile', viewData);
    },
  );

  router.patch(
    '/users/:id',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const requestedUser = await findRequestedUser(ctx, models.User.scope('active'));
      const editPermission = checkUserPermissions
        .canUserModifyUserData(currentUser, requestedUser);

      if (!editPermission) {
        ctx.throw(403);
      }

      logger.mainProcessLog('%s | %s | Updating user: %o, to: %o', ctx.method, ctx.url, requestedUser.get(), ctx.request.body);

      const normalizeRequestBody = (requestBody) => {
        if (!requestBody.password) {
          return _.omit(requestBody, 'password');
        }

        return requestBody;
      };

      try {
        ctx.request.body = normalizeRequestBody(ctx.request.body);
        await requestedUser.update(ctx.request.body);
      } catch (err) {
        if (!(err instanceof requestedUser.sequelize.ValidationError)) {
          throw err;
        }
        logger.mainProcessLog('%s | %s | User %o has not been updated. Form data is invalid:\n%O', ctx.method, ctx.url, requestedUser.get(), err);
        const viewData = {
          pageTitle: pageTitles.myProfile,
          editPermission,
        };
        renderFormErrors(ctx, err.errors, 'users/profile', viewData);
        return;
      }

      logger.mainProcessLog('%s | %s | User has been updated', ctx.method, ctx.url);

      ctx.flash = { message: 'Ваши данные успешно обновлены' };
      makeRedirect(ctx, router.url('userProfile', { id: requestedUser.id }));
    },
  );

  router.delete(
    '/users/:id',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const requestedUser = await findRequestedUser(ctx, models.User.scope('active'));
      const editPermission = checkUserPermissions
        .canUserModifyUserData(currentUser, requestedUser);

      if (!editPermission) {
        ctx.throw(403);
      }

      logger.mainProcessLog('%s | %s | Deleting user: %o', ctx.method, ctx.url, requestedUser.get());

      requestedUser.delete();
      await requestedUser.save();

      clearSession(ctx);

      logger.mainProcessLog('%s | %s | User has been updated. Session was cleared', ctx.method, ctx.url);

      ctx.flash = { message: `Пользователь с email: '${requestedUser.email}' успешно удален из системы` };
      makeRedirect(ctx, router.url('index'));
    },
  );

  router.get(
    'userQueryToRestore',
    '/users/deleted/:id/restore',
    async (ctx) => {
      const { restorableUser } = ctx.state;
      const requestedUser = await findRequestedUser(ctx, models.User.scope('deleted'));
      const restorePermission = checkUserPermissions
        .canUserModifyUserData(restorableUser, requestedUser);

      if (!restorePermission) {
        ctx.throw(403);
      }

      const viewData = { pageTitle: pageTitles.restoreUser };
      ctx.render('users/query-to-restore', viewData);
    },
  );

  router.patch(
    'userRestore',
    '/users/deleted/:id',
    async (ctx) => {
      const { restorableUser } = ctx.state;
      const requestedUser = await findRequestedUser(ctx, models.User.scope('deleted'));
      const restorePermission = checkUserPermissions
        .canUserModifyUserData(restorableUser, requestedUser);

      if (!restorePermission) {
        ctx.throw(403);
      }

      logger.mainProcessLog('%s | %s | Restoring user:\n%o', ctx.method, ctx.url, requestedUser.get());

      requestedUser.restore();
      await requestedUser.save();

      clearSession(ctx);

      logger.mainProcessLog('%s | %s | User has been restored. Session was cleared', ctx.method, ctx.url);
      ctx.flash = { message: `Пользователь с email: '${requestedUser.email}' успешно восстановлен в системе. Вы можете аутентифицироваться` };
      makeRedirect(ctx, router.url('index'));
    },
  );
};
