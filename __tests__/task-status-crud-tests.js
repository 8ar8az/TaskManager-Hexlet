import request from 'supertest';
import faker from 'faker';
import initApplication from '../src';
import testHelpers from './test-helpers/test-helpers';

faker.locale = 'ru';

describe("Get a page for managmanet of task's statuses", () => {
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

  test("GET-request to page for task's statuses management", async () => {
    const response = await request(httpServer.getRequestHandler()).get(router.url('taskStatusesIndex'));
    expect(response.status).toBe(200);
  });
});

describe("Create task's status", () => {
  let httpServer;
  let router;
  let models;

  let taskStatusName;
  let taskStatus;

  let user;
  let userPassword;
  let sessionCookie;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    taskStatusName = faker.random.word();

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

  test("Attempt to create a task's status without a logged user", async () => {
    const response = await request(httpServer.getRequestHandler())
      .post(router.url('taskStatusesIndex'))
      .type('form')
      .send({ name: taskStatusName });
    expect(response.status).toBe(403);

    taskStatus = await models.TaskStatus.findOne({ where: { name: taskStatusName } });
    expect(taskStatus).toBeNull();
  });

  test("Attempt to create a task's status with a logged user", async () => {
    sessionCookie = await testHelpers.userSingIn(httpServer, user, userPassword);

    const response = await request(httpServer.getRequestHandler())
      .post(router.url('taskStatusesIndex'))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ name: taskStatusName });
    expect(response.status).toBe(303);

    taskStatus = await models.TaskStatus.findOne({ where: { name: taskStatusName } });
    expect(taskStatus).toBeInstanceOf(models.TaskStatus);
  });

  test('Attempt to create a task with name which already exist', async () => {
    const response = await request(httpServer.getRequestHandler())
      .post(router.url('taskStatusesIndex'))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ name: taskStatusName });
    expect(response.status).toBe(422);

    const taskStatuses = await models.TaskStatus.findAll({ where: { name: taskStatusName } });
    expect(taskStatuses).toHaveLength(1);
  });
});

describe("Update name of task's status", () => {
  let httpServer;
  let router;
  let models;

  let user;
  let userPassword;
  let sessionCookie;

  let taskStatus;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    userPassword = testHelpers.generateUserPassword();
    user = await testHelpers.createUser(models.User, userPassword);

    taskStatus = await models.TaskStatus.create({ name: faker.random.word() });

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test("Attempt to update a task's status which doesn't exist", async () => {
    const newTaskStatusName = faker.random.word();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('taskStatus', { id: -99 }))
      .type('form')
      .send({ name: newTaskStatusName });
    expect(response.status).toBe(404);
  });

  test("Attempt to update a task's status without a logged user", async () => {
    const newTaskStatusName = faker.random.word();
    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('taskStatus', { id: taskStatus.id }))
      .type('form')
      .send({ name: newTaskStatusName });
    expect(response.status).toBe(403);

    await taskStatus.reload();
    expect(taskStatus.name).not.toBe(newTaskStatusName);
  });

  test("Attempt to update a task's status with a logged user", async () => {
    sessionCookie = await testHelpers.userSingIn(httpServer, user, userPassword);

    const newTaskStatusName = faker.random.word();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('taskStatus', { id: taskStatus.id }))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ name: newTaskStatusName });
    expect(response.status).toBe(303);

    await taskStatus.reload();
    expect(taskStatus.name).toBe(newTaskStatusName);
  });

  test("Attempt to update name task's status to already exist name", async () => {
    const newTaskStatusName = faker.random.word();
    await models.TaskStatus.create({ name: newTaskStatusName });

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('taskStatus', { id: taskStatus.id }))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ name: newTaskStatusName });
    expect(response.status).toBe(422);

    await taskStatus.reload();
    expect(taskStatus.name).not.toBe(newTaskStatusName);
  });
});

describe("Delete task's status", () => {
  let httpServer;
  let router;
  let models;

  let user;
  let userPassword;
  let sessionCookie;

  let taskStatus;
  let task;
  let task2;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    userPassword = testHelpers.generateUserPassword();
    user = await testHelpers.createUser(models.User, userPassword);

    taskStatus = await models.TaskStatus.create({ name: faker.random.word() });
    task = await models.Task.create({
      creatorId: user.id,
      name: 'Task',
      statusId: taskStatus.id,
    });

    task2 = await models.Task.create({
      creatorId: user.id,
      name: 'Task',
      statusId: taskStatus.id,
    });

    task2.delete();
    await task2.save();

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test("Attempt to delete a task's status which doesn't exist", async () => {
    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('taskStatus', { id: -99 }));
    expect(response.status).toBe(404);
  });

  test("Attempt to delete task's status without logged user", async () => {
    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('taskStatus', { id: taskStatus.id }));
    expect(response.status).toBe(403);

    await taskStatus.reload();
    expect(taskStatus.isActive).toBeTruthy();
  });

  test("Attempt to delete task's status which linked with active task", async () => {
    sessionCookie = await testHelpers.userSingIn(httpServer, user, userPassword);

    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('taskStatus', { id: taskStatus.id }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(424);

    await taskStatus.reload();
    expect(taskStatus.isActive).toBeTruthy();
  });

  test("Attempt to delete task's status with logged user", async () => {
    task.delete();
    await task.save();

    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('taskStatus', { id: taskStatus.id }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(303);

    await taskStatus.reload();
    expect(taskStatus.isActive).toBeFalsy();
  });

  test("Attempt to create task's status with name which already exist at deleted task's status", async () => {
    const response = await request(httpServer.getRequestHandler())
      .post(router.url('taskStatusesIndex'))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ name: taskStatus.name });
    expect(response.status).toBe(303);

    await taskStatus.reload();
    expect(taskStatus.isActive).toBeTruthy();
  });
});

describe("Modify the system's task statuses", () => {
  let httpServer;
  let router;
  let models;

  let user;
  let userPassword;
  let sessionCookie;

  let systemTaskStatus;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    userPassword = testHelpers.generateUserPassword();
    user = await testHelpers.createUser(models.User, userPassword);

    sessionCookie = await testHelpers.userSingIn(httpServer, user, userPassword);
    systemTaskStatus = await models.TaskStatus.findOne({ where: { name: 'Новая' } });

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test("Attempt to change the system's task status", async () => {
    const newTaskStatusName = faker.random.word();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('taskStatus', { id: systemTaskStatus.id }))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ name: newTaskStatusName });
    expect(response.status).toBe(403);

    await systemTaskStatus.reload();
    expect(systemTaskStatus.name).not.toBe(newTaskStatusName);
  });

  test("Attempt to delete the system's task status", async () => {
    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('taskStatus', { id: systemTaskStatus.id }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(403);

    await systemTaskStatus.reload();
    expect(systemTaskStatus.isActive).toBeTruthy();
  });
});
