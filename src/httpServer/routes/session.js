import encrypt from '../../lib/secure';
import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';

const errorMessages = {
  signInError: 'Неверная комбинация email и пароля. Попробуйте еще раз',
};

const pageTitles = {
  newSession: 'Вход',
};

const flashMessages = {
  signIn: 'Вы успешно вошли в систему',
  signOut: 'Вы успешно вышли из системы',
};

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
    const viewData = { pageTitle: pageTitles.newSession, errors: [], formData: [] };
    ctx.render('session/new', viewData);
  });

  router.post('session', '/session', async (ctx) => {
    const { email, password } = ctx.request.body;
    logger.mainProcessLog('%s | %s | Attempt sign in for user with email: %s', ctx.method, ctx.url, email);

    const userForAuthentication = await models.User.findOne({ where: { email } });

    if (!isCorrectPassword(password, userForAuthentication)) {
      logger.mainProcessLog("%s | %s | User with email: '%s' couldn't sign in. Invalid email/password combination", ctx.method, ctx.url, email);
      const error = new Error(errorMessages.signInError);
      renderFormErrors(ctx, [error], 'session/new', { pageTitle: pageTitles.newSession });
      return;
    }

    userSignIn(ctx, userForAuthentication);

    if (userForAuthentication.isActive) {
      logger.mainProcessLog("%s | %s | User with email: '%s' successful sign in", ctx.method, ctx.url, email);
      ctx.flash = { message: flashMessages.signIn };
      makeRedirect(ctx, router.url('index'));
      return;
    }

    logger.mainProcessLog("%s | %s | User with email: '%s' is deleted. It can be restored", ctx.method, ctx.url, email);
    makeRedirect(ctx, router.url('userQueryToRestore', { id: userForAuthentication.id }));
  });

  router.delete('/session', async (ctx) => {
    clearSession(ctx);
    logger.mainProcessLog('%s | %s | Session has been cleared', ctx.method, ctx.url);

    ctx.flash = { message: flashMessages.signOut };
    makeRedirect(ctx, router.url('index'));
  });

  return router;
};
