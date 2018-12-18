import request from 'supertest';
import faker from 'faker';
import initApplication from '../src';
import { generateTestUserData, createTestUser, userSingIn } from './__fixtures__/utils';

faker.locale = 'ru';

describe("Get user's list", () => {
  let appContainer;
  let server;

  beforeAll(async (done) => {
    appContainer = initApplication();
    server = await appContainer.httpServer;

    await server.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await server.close(() => {
      done();
    });
  });

  test('GET-request to /users', async () => {
    const response = await request(server.getRequestHandler()).get('/users');
    expect(response.status).toBe(200);
  });
});

describe('Create user', () => {
  let appContainer;
  let server;

  beforeAll(async (done) => {
    appContainer = initApplication();
    server = await appContainer.httpServer;

    await server.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await server.close(() => {
      done();
    });
  });

  test('GET-request to /users/new', async () => {
    const response = await request(server.getRequestHandler()).get('/users/new');
    expect(response.status).toBe(200);
  });

  test('POST-request to /users with correct body', async () => {
    const userData = generateTestUserData();

    const response = await request(server.getRequestHandler())
      .post('/users')
      .type('form')
      .send(userData);
    expect(response.status).toBe(303);

    const models = await appContainer.models;
    const createdUser = await models.User.findOne({ where: { email: userData.email } });

    expect(createdUser.firstname).toBe(userData.firstname);
    expect(createdUser.lastname).toBe(userData.lastname);
  });

  test('POST-request to /users with with incorrect body', async () => {
    const userData = generateTestUserData();

    const response = await request(server.getRequestHandler())
      .post('/users')
      .type('form')
      .send({ ...userData, email: 'wrongEmail' });
    expect(response.status).toBe(422);
  });
});

describe('Update user', () => {
  let appContainer;
  let server;
  let user;
  let userPassword;

  beforeAll(async (done) => {
    appContainer = initApplication();
    server = await appContainer.httpServer;
    const models = await appContainer.models;

    const userData = generateTestUserData();
    userPassword = userData.password;
    user = await createTestUser(models.User, userData);

    await server.start(async () => {
      done();
    });
  });

  afterAll(async (done) => {
    await server.close(() => {
      done();
    });
  });

  test('GET-request to /users/:id/edit where :id is existed', async () => {
    const response = await request(server.getRequestHandler())
      .get(`/users/${user.id}/edit`);
    expect(response.status).toBe(200);
  });

  test('GET-request to /users/:id/edit where :id is not existed', async () => {
    const response = await request(server.getRequestHandler())
      .get('/users/-99/edit');
    expect(response.status).toBe(404);
  });

  test('PUT-request to /users/:id with correct body', async () => {
    const sessionCookie = await userSingIn(server.getRequestHandler(), user, userPassword);

    const newUserData = generateTestUserData();

    const response = await request(server.getRequestHandler())
      .put(`/users/${user.id}`)
      .type('form')
      .set('Cookie', sessionCookie)
      .send(newUserData);
    expect(response.status).toBe(303);

    await user.reload();
    userPassword = newUserData.password;

    expect(user.email).toBe(newUserData.email);
  });

  test('PUT-request to /users/:id with incorrect body', async () => {
    const sessionCookie = await userSingIn(server.getRequestHandler(), user, userPassword);

    const newUserData = generateTestUserData();

    const response = await request(server.getRequestHandler())
      .put(`/users/${user.id}`)
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ ...newUserData, email: 'wrongEmail' });
    expect(response.status).toBe(422);

    await user.reload();

    expect(user.email).not.toBe(newUserData.email);
  });

  test('PUT-request for user without session', async () => {
    const newUserData = generateTestUserData();

    const response = await request(server.getRequestHandler())
      .put(`/users/${user.id}`)
      .type('form')
      .send(newUserData);
    expect(response.status).toBe(403);

    await user.reload();
    expect(user.email).not.toBe(newUserData.email);
  });
});

describe('Delete user', () => {
  let appContainer;
  let server;
  let user;
  let userPassword;

  beforeAll(async (done) => {
    appContainer = initApplication();
    server = await appContainer.httpServer;
    const models = await appContainer.models;

    const userData = generateTestUserData();
    userPassword = userData.password;
    user = await createTestUser(models.User, userData);

    await server.start(async () => {
      done();
    });
  });

  afterAll(async (done) => {
    await server.close(() => {
      done();
    });
  });

  test('DELETE-request to /users/:id where :id is not exist', async () => {
    const response = await request(server.getRequestHandler())
      .delete('/users/-999');
    expect(response.status).toBe(404);
  });

  test('DELETE-request for user without session', async () => {
    const response = await request(server.getRequestHandler())
      .delete(`/users/${user.id}`);
    expect(response.status).toBe(403);

    await user.reload();
    expect(user.status).toBe('active');
  });

  test('DELETE-request to /users/:id where :id is exist', async () => {
    const sessionCookie = await userSingIn(server.getRequestHandler(), user, userPassword);

    const response = await request(server.getRequestHandler())
      .delete(`/users/${user.id}`)
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(303);

    await user.reload();
    expect(user.status).toBe('deleted');
  });
});

describe('Restore deleted user', () => {
  let appContainer;
  let server;
  let user;
  let userPassword;

  beforeAll(async (done) => {
    appContainer = initApplication();
    server = await appContainer.httpServer;
    const models = await appContainer.models;

    const userData = generateTestUserData();
    user = await createTestUser(models.User, userData);
    userPassword = userData.password;

    user.delete();
    await user.save();

    await server.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await server.close(() => {
      done();
    });
  });

  test('Get data for deleted user', async () => {
    const response = await request(server.getRequestHandler()).get(`/users/${user.id}/edit`);
    expect(response.status).toBe(404);
  });

  test('Get /users/deleted/:id/restore without preliminary authentication', async () => {
    const response = await request(server.getRequestHandler()).get(`/users/deleted/${user.id}/restore`);
    expect(response.status).toBe(403);
  });

  test('Restore user without preliminary authentication', async () => {
    const response = await request(server.getRequestHandler()).patch(`/users/deleted/${user.id}`);
    expect(response.status).toBe(403);
  });

  test('Restore user with authentication', async () => {
    const sessionCookie = await userSingIn(server.getRequestHandler(), user, userPassword);

    const pageWithRestoreConfirmationResponse = await request(server.getRequestHandler())
      .get(`/users/deleted/${user.id}/restore`)
      .set('Cookie', sessionCookie);
    expect(pageWithRestoreConfirmationResponse.status).toBe(200);

    const userRestoreResponse = await request(server.getRequestHandler())
      .patch(`/users/deleted/${user.id}`)
      .set('Cookie', sessionCookie);
    expect(userRestoreResponse.status).toBe(303);

    await user.reload();
    expect(user.status).toBe('active');
  });
});
