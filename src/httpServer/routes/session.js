import encrypt from '../../lib/secure';
import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';

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

export default (router, models) => {
  router.get('sessionNew', '/session/new', (ctx) => {
    const viewData = { pageTitle: ctx.t('page-titles:session.new'), errors: [], formData: {} };
    ctx.render('session/new', viewData);
  });

  router.post('session', '/session', async (ctx) => {
    const { email, password } = ctx.request.body;

    const userForAuthentication = await models.User.findOne({ where: { email } });

    if (!isCorrectPassword(password, userForAuthentication)) {
      const error = new Error(ctx.t('validation:Session.email-password-combination'));
      const viewData = { pageTitle: ctx.t('page-titles:session.new'), formData: { email, password } };
      renderFormErrors(ctx, [error], 'session/new', viewData);
      return;
    }

    userSignIn(ctx, userForAuthentication);

    if (userForAuthentication.isActive) {
      ctx.flash = { message: ctx.t('flash-messages:session.userSignIn') };
      makeRedirect(ctx, router.url('index'));
      return;
    }

    makeRedirect(ctx, router.url('usersQueryToRestore', { id: userForAuthentication.id }));
  });

  router.delete('/session', async (ctx) => {
    clearSession(ctx);

    ctx.flash = { message: ctx.t('flash-messages:session.userSignOut') };
    makeRedirect(ctx, router.url('index'));
  });

  return router;
};
