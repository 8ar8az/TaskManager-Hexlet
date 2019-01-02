import request from 'supertest';
import initApplication from '../src';
import initHttpServer from '../src/httpServer';
import testHelpers from './test-helpers/test-helpers';

describe("Session's routes", () => {
  let httpServer;
  let models;
  let router;

  let sessionCookie;
  let user;
  let userPassword;

  beforeAll(async (done) => {
    ({ httpServer, models, router } = await testHelpers.getAppComponents(initApplication()));

    userPassword = testHelpers.generateUserPassword();
    user = await testHelpers.createUser(models.User, userPassword);

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test('Get page for user sign in (create new session)', async () => {
    const response = await request(httpServer.getRequestHandler()).get(router.url('newSession'));
    expect(response.status).toBe(200);
  });

  test('Attempt to sign in user with incorrect combination email/password', async () => {
    const response = await request(httpServer.getRequestHandler())
      .post(router.url('session'))
      .type('form')
      .send({ email: user.email, password: testHelpers.generateUserPassword() });
    expect(response.status).toBe(422);
  });

  test('Attempt to sign in user with correct combination email/password', async () => {
    const response = await request(httpServer.getRequestHandler())
      .post(router.url('session'))
      .type('form')
      .send({ email: user.email, password: userPassword });
    expect(response.status).toBe(303);

    sessionCookie = response.header['set-cookie'];
  });

  test('Attempt to sign out for logged user', async () => {
    const deleteSessionResponse = await request(httpServer.getRequestHandler())
      .delete(router.url('session'))
      .set('Cookie', sessionCookie);
    expect(deleteSessionResponse.status).toBe(303);

    sessionCookie = deleteSessionResponse.header['set-cookie'];

    const deleteUserResponse = await request(httpServer.getRequestHandler())
      .delete(router.url('user', { id: user.id }))
      .set('Cookie', sessionCookie);
    expect(deleteUserResponse.status).toBe(403);
  });
});

describe("Check mechanism of session's expiration", () => {
  let routing;
  let mockHttpServer;

  let user;
  let userPassword;

  beforeAll(async (done) => {
    const {
      database,
      logger,
      models,
      router,
      sessionParseMiddleware,
      sessionConfig,
      reportAboutError,
    } = await testHelpers.getAppComponents(initApplication());
    routing = router;

    const mockSessionConfig = { ...sessionConfig, maxAge: 300 };

    const server = initHttpServer({
      router,
      logger,
      reportAboutError,
      sessionParseMiddleware,
      sessionConfig: mockSessionConfig,
    });

    mockHttpServer = {
      async start(...args) {
        server.listen(...args);
      },
      async close(...args) {
        await database.close();
        server.close(...args);
      },
      getRequestHandler() {
        return server;
      },
    };

    userPassword = testHelpers.generateUserPassword();
    user = await testHelpers.createUser(models.User, userPassword);

    await mockHttpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await mockHttpServer.close(() => {
      done();
    });
  });

  test('Attempt to delete user after session has been expired', async (done) => {
    const sessionCookie = await testHelpers.userSingIn(mockHttpServer, user, userPassword);

    setTimeout(async () => {
      const userDeleteResponse = await request(mockHttpServer.getRequestHandler())
        .delete(routing.url('user', { id: user.id }))
        .set('Cookie', sessionCookie);
      expect(userDeleteResponse.status).toBe(403);
      done();
    }, 500);
  });

  test('Attempt to delete user before session has been expired', async (done) => {
    const sessionCookie = await testHelpers.userSingIn(mockHttpServer, user, userPassword);

    setTimeout(async () => {
      const userDeleteResponse = await request(mockHttpServer.getRequestHandler())
        .delete(routing.url('user', { id: user.id }))
        .set('Cookie', sessionCookie);
      expect(userDeleteResponse.status).toBe(303);
      done();
    }, 100);
  });
});
