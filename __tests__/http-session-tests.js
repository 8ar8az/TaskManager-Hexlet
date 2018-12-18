import request from 'supertest';
import initApplication from '../src';
import logger from '../src/lib/logger';
import initHttpServer from '../src/httpServer';
import { generateTestUserData, createTestUser, userSingIn } from './__fixtures__/utils';

describe('Session routes', () => {
  let appContainer;
  let server;
  let models;
  let cookie;
  let user;
  let userPassword;

  beforeAll(async (done) => {
    appContainer = initApplication();
    server = await appContainer.httpServer;
    models = await appContainer.models;

    const userData = generateTestUserData();
    user = await createTestUser(models.User, userData);
    userPassword = userData.password;

    await server.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await server.close(() => {
      done();
    });
  });

  test('GET-request to /session/new', async () => {
    const response = await request(server.getRequestHandler()).get('/session/new');
    expect(response.status).toBe(200);
  });

  test('POST-request to /session with incorrect email/password', async () => {
    const newTestUserData = generateTestUserData();

    const response = await request(server.getRequestHandler())
      .post('/session')
      .type('form')
      .send({ email: user.email, password: newTestUserData.password });
    expect(response.status).toBe(422);
  });

  test('POST-request to /session with correct login/password', async () => {
    const response = await request(server.getRequestHandler())
      .post('/session')
      .type('form')
      .send({ email: user.email, password: userPassword });

    cookie = response.header['set-cookie'];

    expect(response.status).toBe(303);
  });

  test('DELETE-request to /session', async () => {
    const deleteSessionResponse = await request(server.getRequestHandler())
      .delete('/session')
      .set('Cookie', cookie);
    expect(deleteSessionResponse.status).toBe(303);

    cookie = deleteSessionResponse.header['set-cookie'];

    const deleteUserResponse = await request(server.getRequestHandler())
      .delete(`/users/${user.id}`)
      .set('Cookie', cookie);
    expect(deleteUserResponse.status).toBe(403);
  });
});

describe('Session expiration', () => {
  let db;
  let mockHttpServer;
  let user;
  let userPassword;

  beforeAll(async (done) => {
    const appContainer = initApplication();

    const database = await appContainer.database;
    const models = await appContainer.models;
    const router = await appContainer.router;
    const sessionParseMiddleware = await appContainer.sessionParseMiddleware;
    const sessionConfig = await appContainer.sessionConfig;
    const reportAboutError = await appContainer.reportAboutError;

    const mockSessionConfig = { ...sessionConfig, maxAge: 300 };

    mockHttpServer = initHttpServer({
      router,
      logger,
      reportAboutError,
      sessionParseMiddleware,
      sessionConfig: mockSessionConfig,
    });
    db = database;

    const userData = generateTestUserData();
    userPassword = userData.password;
    user = await createTestUser(models.User, userData);

    mockHttpServer.listen(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await db.close();
    mockHttpServer.close(() => {
      done();
    });
  });

  test('Delete user after session expiration', async (done) => {
    const sessionCookie = await userSingIn(mockHttpServer, user, userPassword);

    setTimeout(async () => {
      const userDeleteResponse = await request(mockHttpServer)
        .delete(`/users/${user.id}`)
        .set('Cookie', sessionCookie);
      expect(userDeleteResponse.status).toBe(403);
      done();
    }, 500);
  });

  test('Delete user before session expiration', async (done) => {
    const sessionCookie = await userSingIn(mockHttpServer, user, userPassword);

    setTimeout(async () => {
      const userDeleteResponse = await request(mockHttpServer)
        .delete(`/users/${user.id}`)
        .set('Cookie', sessionCookie);
      expect(userDeleteResponse.status).toBe(303);
      done();
    }, 100);
  });
});
