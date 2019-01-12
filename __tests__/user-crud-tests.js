import request from 'supertest';
import faker from 'faker';
import initApplication from '../src';
import testHelpers from './test-helpers/test-helpers';

faker.locale = 'ru';

describe("Get user's list", () => {
  let httpServer;
  let router;

  beforeAll(async (done) => {
    ({ httpServer, router } = await testHelpers.getAppComponents(initApplication()));

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test("Attempt to get user's list", async () => {
    const response = await request(httpServer.getRequestHandler()).get(router.url('usersIndex'));
    expect(response.status).toBe(200);
  });
});

describe('Create user', () => {
  let httpServer;
  let router;
  let models;

  beforeAll(async (done) => {
    ({ httpServer, models, router } = await testHelpers.getAppComponents(initApplication()));

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test('Attempt to get page for create user', async () => {
    const response = await request(httpServer.getRequestHandler()).get(router.url('usersNew'));
    expect(response.status).toBe(200);
  });

  test("Attempt to create user with corrent user's data", async () => {
    const userData = testHelpers.generateUserData();
    const userPassword = testHelpers.generateUserPassword();

    const response = await request(httpServer.getRequestHandler())
      .post(router.url('usersIndex'))
      .type('form')
      .send({ ...userData, password: userPassword });
    expect(response.status).toBe(303);

    const createdUser = await models.User.findOne({ where: { email: userData.email } });

    expect(createdUser.firstname).toBe(userData.firstname);
    expect(createdUser.lastname).toBe(userData.lastname);
  });

  test("Attempt to create user with incorrent user's data", async () => {
    const userData = testHelpers.generateUserData();
    const userPassword = testHelpers.generateUserPassword();

    const response = await request(httpServer.getRequestHandler())
      .post(router.url('usersIndex'))
      .type('form')
      .send({ ...userData, email: 'wrongEmail', password: userPassword });
    expect(response.status).toBe(422);

    const createdUser = await models.User.findOne({ where: { email: 'wrongEmail' } });
    expect(createdUser).toBeNull();
  });
});

describe('Update user', () => {
  let httpServer;
  let router;
  let models;

  let user1;
  let user1Password;
  let user2;
  let sessionCookie;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    user1Password = testHelpers.generateUserPassword();
    const user2Password = testHelpers.generateUserPassword();
    [user1, user2] = await Promise.all([
      testHelpers.createUser(models.User, user1Password),
      testHelpers.createUser(models.User, user2Password),
    ]);

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test("Get page with user's data which is exist", async () => {
    const response = await request(httpServer.getRequestHandler())
      .get(router.url('usersProfile', { id: user1.id }));
    expect(response.status).toBe(200);
  });

  test("Get page with user's data which is not exist", async () => {
    const response = await request(httpServer.getRequestHandler())
      .get(router.url('usersProfile', { id: -999 }));
    expect(response.status).toBe(404);
  });

  test('Attempt to update user data without logged user', async () => {
    const newUserData = testHelpers.generateUserData();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('usersProfile', { id: user1.id }))
      .type('form')
      .send(newUserData);
    expect(response.status).toBe(403);

    await user1.reload();
    expect(user1.email).not.toBe(newUserData.email);
  });

  test('Attempt to update user data with logged user, but updated user is not same that logged user', async () => {
    sessionCookie = await testHelpers.userSingIn(httpServer, user1, user1Password);
    const newUserData = testHelpers.generateUserData();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('usersProfile', { id: user2.id }))
      .type('form')
      .send(newUserData);
    expect(response.status).toBe(403);

    await user2.reload();
    expect(user2.email).not.toBe(newUserData.email);
  });

  test('Attempt to update user data with logged user and correct form data', async () => {
    const newUserData = testHelpers.generateUserData();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('usersProfile', { id: user1.id }))
      .type('form')
      .set('Cookie', sessionCookie)
      .send(newUserData);
    expect(response.status).toBe(303);

    await user1.reload();
    expect(user1.email).toBe(newUserData.email);
  });

  test('Attempt to update user data with logged user and incorrect form data', async () => {
    const newUserData = testHelpers.generateUserData();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('usersProfile', { id: user1.id }))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ ...newUserData, email: 'wrongEmail' });
    expect(response.status).toBe(422);

    await user1.reload();
    expect(user1.email).not.toBe(newUserData.email);
  });
});

describe('Delete user', () => {
  let httpServer;
  let router;
  let models;

  let user1;
  let user1Password;
  let user2;
  let sessionCookie;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    user1Password = testHelpers.generateUserPassword();
    const user2Password = testHelpers.generateUserPassword();
    [user1, user2] = await Promise.all([
      testHelpers.createUser(models.User, user1Password),
      testHelpers.createUser(models.User, user2Password),
    ]);

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test('Attempt to delete user which is not exist', async () => {
    sessionCookie = await testHelpers.userSingIn(httpServer, user1, user1Password);

    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('usersProfile', { id: -999 }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(404);
  });

  test('Attempt to delete user without logged user', async () => {
    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('usersProfile', { id: user1.id }));
    expect(response.status).toBe(403);

    await user1.reload();
    expect(user1.isActive).toBeTruthy();
  });

  test('Attempt to delete user data with logged user, but deleted user is not same that logged user', async () => {
    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('usersProfile', { id: user2.id }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(403);

    await user2.reload();
    expect(user2.isActive).toBeTruthy();
  });

  test('Attempt to delete user with logged user', async () => {
    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('usersProfile', { id: user1.id }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(303);

    const user = await models.User.scope(['deleted']).findOne({ where: { email: user1.email } });
    expect(user.isActive).toBeFalsy();
  });
});

describe('Restore deleted user', () => {
  let httpServer;
  let router;
  let models;

  let user;
  let userPassword;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    userPassword = testHelpers.generateUserPassword();
    user = await testHelpers.createUser(models.User, userPassword);

    user.delete();
    await user.save();

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test('Appempt to get user profile for deleted user', async () => {
    const response = await request(httpServer.getRequestHandler())
      .get(router.url('usersProfile', { id: user.id }));
    expect(response.status).toBe(404);
  });

  test("Attempt to get user's restore page without authentication", async () => {
    const response = await request(httpServer.getRequestHandler())
      .get(router.url('usersQueryToRestore', { id: user.id }));
    expect(response.status).toBe(403);
  });

  test('Attempt to restore user without preliminary authentication', async () => {
    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('usersRestore', { id: user.id }));
    expect(response.status).toBe(403);
  });

  test('Attempt to restore user with authentication', async () => {
    const sessionCookie = await testHelpers.userSingIn(httpServer, user, userPassword);

    const pageWithRestoreConfirmationResponse = await request(httpServer.getRequestHandler())
      .get(router.url('usersQueryToRestore', { id: user.id }))
      .set('Cookie', sessionCookie);
    expect(pageWithRestoreConfirmationResponse.status).toBe(200);

    const userRestoreResponse = await request(httpServer.getRequestHandler())
      .patch(router.url('usersRestore', { id: user.id }))
      .set('Cookie', sessionCookie);
    expect(userRestoreResponse.status).toBe(303);

    await user.reload();
    expect(user.isActive).toBeTruthy();
  });
});
