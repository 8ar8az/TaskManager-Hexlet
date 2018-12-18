import encrypt from '../../lib/secure';
import makeRedirect from './utils/redirect';
import renderFormErrors from './utils/form-errors-render';

const errorMessage = 'Неверная комбинация email и пароля. Попробуйте еще раз';

const isCorrectPassword = (password, userForAuthentication) => (
  !!userForAuthentication
  && (userForAuthentication.passwordHash === encrypt(password))
);

export const userSignIn = (ctx, user) => {
  ctx.session.userId = user.id;
};

export const clearSession = (ctx) => {
  ctx.session = {};
};

export default (router, models, logger) => {
  router.get('newSession', '/session/new', (ctx) => {
    const viewData = { pageTitle: 'Вход', errors: null };
    ctx.render('user/login', viewData);
  });

  router.post('session', '/session', async (ctx) => {
    const { email, password } = ctx.request.body;
    logger.mainProcessLog('%s | %s | Attempt sign in for user with email: %s', ctx.method, ctx.url, email);

    const userForAuthentication = await models.User.findOne({ where: { email } });

    if (!isCorrectPassword(password, userForAuthentication)) {
      logger.mainProcessLog("%s | %s | User with email: '%s' couldn't sign in. Invalid email/password combination", ctx.method, ctx.url, email);
      const errors = [new Error(errorMessage)];
      renderFormErrors(ctx, errors, 'user/login', { pageTitle: 'Вход' });
      return;
    }

    userSignIn(ctx, userForAuthentication);

    if (userForAuthentication.isActive) {
      logger.mainProcessLog("%s | %s | User with email: '%s' successful sign in", ctx.method, ctx.url, email);
      ctx.flash = { message: 'Вы успешно вошли в систему' };
      makeRedirect(ctx, router.url('root'));
      return;
    }

    logger.mainProcessLog("%s | %s | User with email: '%s' is deleted. It can be restored", ctx.method, ctx.url, email);
    makeRedirect(ctx, router.url('userRestoreConfirmation', { userId: userForAuthentication.id }));
  });

  router.delete('/session', async (ctx) => {
    clearSession(ctx);
    logger.mainProcessLog('%s | %s | Session has been cleared', ctx.method, ctx.url);

    ctx.flash = { message: 'Вы успешно вышли из системы' };
    makeRedirect(ctx, router.url('root'));
  });

  return router;
};
