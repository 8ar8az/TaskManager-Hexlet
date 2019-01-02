import request from 'supertest';
import faker from 'faker';
import _ from 'lodash';
import initApplication from '../src';
import testHelpers from './test-helpers/test-helpers';

faker.locale = 'ru';

const generateTaskData = () => {
  const taskData = {
    name: faker.random.word(),
    description: faker.random.words(),
  };

  return taskData;
};

describe('Get a page for management of tasks', () => {
  let httpServer;
  let router;
  let models;

  let user;
  let userPassword;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

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

  test('GET-request to page for task management', async () => {
    const response = await request(httpServer.getRequestHandler()).get(router.url('tasksIndex'));
    expect(response.status).toBe(200);
  });

  test("GET page with current user's tasks without logged user", async () => {
    const response = await request(httpServer.getRequestHandler()).get(router.url('myTasks'));
    expect(response.status).toBe(403);
  });

  test("GET page with current user's tasks with logged user", async () => {
    const sessionCookie = await testHelpers.userSingIn(httpServer, user, userPassword);

    const response = await request(httpServer.getRequestHandler())
      .get(router.url('myTasks'))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(200);
  });
});

describe('Create a task', () => {
  let httpServer;
  let router;
  let models;

  let taskData;

  let user1;
  let user2;
  let user1Password;
  let sessionCookie;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    user1Password = testHelpers.generateUserPassword();
    [user1, user2] = await Promise.all([
      testHelpers.createUser(models.User, user1Password),
      testHelpers.createUser(models.User, testHelpers.generateUserPassword()),
    ]);

    taskData = generateTaskData();

    await httpServer.start(() => {
      done();
    });
  });

  afterAll(async (done) => {
    await httpServer.close(() => {
      done();
    });
  });

  test('Get a page for create the new task without a logged user', async () => {
    const response = await request(httpServer.getRequestHandler()).get(router.url('newTask'));
    expect(response.status).toBe(403);
  });

  test('Get a page for create the new task with a logged user', async () => {
    sessionCookie = await testHelpers.userSingIn(httpServer, user1, user1Password);

    const response = await request(httpServer.getRequestHandler())
      .get(router.url('newTask'))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(200);
  });

  test('Attempt to create a task without a logged user', async () => {
    const response = await request(httpServer.getRequestHandler())
      .post(router.url('tasksIndex'))
      .type('form')
      .send({ ...taskData, assignedTo: user2.id });
    expect(response.status).toBe(403);

    const tasks = await models.Task.findAll({ where: taskData });
    expect(tasks).toHaveLength(0);
  });

  test('Attempt to create a task with a logged user', async () => {
    const response = await request(httpServer.getRequestHandler())
      .post(router.url('tasksIndex'))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ ...taskData, assignedTo: user2.id });
    expect(response.status).toBe(303);

    const tasks = await models.Task.findAll({ where: taskData });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toBeInstanceOf(models.Task);
  });

  test('Attempt to create a task without name', async () => {
    const response = await request(httpServer.getRequestHandler())
      .post(router.url('tasksIndex'))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ ...taskData, name: null, assignedTo: user2.id });
    expect(response.status).toBe(422);

    const tasks = await models.Task.findAll({ where: taskData });
    expect(tasks).toHaveLength(1);
  });
});

describe('Modify a task', () => {
  let httpServer;
  let router;
  let models;

  let task1;
  let task2;

  let taskStatusNew;
  let taskStatusWork;
  let taskStatusTest;

  let user1;
  let user1Password;
  let user2;
  let user2Password;
  let user3;
  let user3Password;
  let sessionCookie;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    user1Password = testHelpers.generateUserPassword();
    user2Password = testHelpers.generateUserPassword();
    user3Password = testHelpers.generateUserPassword();
    [user1, user2, user3] = await Promise.all([
      testHelpers.createUser(models.User, user1Password),
      testHelpers.createUser(models.User, user2Password),
      testHelpers.createUser(models.User, user3Password),
    ]);

    [taskStatusNew, taskStatusWork, taskStatusTest] = await Promise.all([
      models.TaskStatus.findOne({ where: { name: 'Новая' } }),
      models.TaskStatus.findOne({ where: { name: 'В работе' } }),
      models.TaskStatus.findOne({ where: { name: 'На тестировании' } }),
    ]);

    const taskData1 = {
      ...generateTaskData(),
      creatorId: user1.id,
      assignedToId: user2.id,
      statusId: taskStatusNew.id,
    };
    const taskData2 = {
      ...generateTaskData(),
      creatorId: user2.id,
      statusId: taskStatusNew.id,
    };
    [task1, task2] = await Promise.all([
      models.Task.create(taskData1),
      models.Task.create(taskData2),
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

  test('Get page for a modify task without a logged user', async () => {
    const response = await request(httpServer.getRequestHandler()).get(router.url('tasksEdit', { id: task1.id }));
    expect(response.status).toBe(403);
  });

  test('Get page for a modify task with a logged user, but not a creator, only a perfomer', async () => {
    const cookie = await testHelpers.userSingIn(httpServer, user2, user2Password);

    const response = await request(httpServer.getRequestHandler())
      .get(router.url('tasksEdit', { id: task1.id }))
      .set('Cookie', cookie);
    expect(response.status).toBe(200);
  });

  test('Get page for a modify task with a logged user, but not a creator and not a perfomer', async () => {
    const cookie = await testHelpers.userSingIn(httpServer, user3, user3Password);

    const response = await request(httpServer.getRequestHandler())
      .get(router.url('tasksEdit', { id: task1.id }))
      .set('Cookie', cookie);
    expect(response.status).toBe(403);
  });

  test("Get page for a modify task with a task's creator user", async () => {
    sessionCookie = await testHelpers.userSingIn(httpServer, user1, user1Password);

    const response = await request(httpServer.getRequestHandler())
      .get(router.url('tasksEdit', { id: task1.id }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(200);
  });

  test('Attempt to modify a task is not exist', async () => {
    const newTaskData = generateTaskData();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('task', { id: -999 }))
      .set('Cookie', sessionCookie)
      .type('form')
      .send(newTaskData);
    expect(response.status).toBe(404);
  });

  test('Attempt to modify a task without a logged user', async () => {
    const newTaskData = generateTaskData();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('task', { id: task1.id }))
      .type('form')
      .send(newTaskData);
    expect(response.status).toBe(403);

    await task1.reload();
    expect(task1.name).not.toBe(newTaskData.name);
    expect(task1.description).not.toBe(newTaskData.description);
  });

  test('Attempt to modify a task with a logged user. Task is created by logged user', async () => {
    const newTaskData = generateTaskData();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('task', { id: task1.id }))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ ...newTaskData, statusId: taskStatusWork.id });
    expect(response.status).toBe(303);

    await task1.reload();
    expect(task1.name).toBe(newTaskData.name);
    expect(task1.description).toBe(newTaskData.description);

    const status = await task1.getStatus();
    expect(status.equals(taskStatusWork)).toBeTruthy();
  });

  test("Attempt to modify a task with a logged user. Logged user is setup as the task's perfomer", async () => {
    const cookie = await testHelpers.userSingIn(httpServer, user2, user2Password);

    const newTaskData = generateTaskData();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('task', { id: task1.id }))
      .type('form')
      .set('Cookie', cookie)
      .send({ ...newTaskData, statusId: taskStatusTest.id });
    expect(response.status).toBe(303);

    await task1.reload();
    expect(task1.name).not.toBe(newTaskData.name);
    expect(task1.description).not.toBe(newTaskData.description);

    const status = await task1.getStatus();
    expect(status.equals(taskStatusTest)).toBeTruthy();
  });

  test('Attempt to modify a task with a logged user. Logged user is not any setup for task (creator or perfomer)', async () => {
    const newTaskData = generateTaskData();

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('task', { id: task2.id }))
      .type('form')
      .set('Cookie', sessionCookie)
      .send(newTaskData);
    expect(response.status).toBe(403);

    await task2.reload();
    expect(task2.name).not.toBe(newTaskData.name);
    expect(task2.description).not.toBe(newTaskData.description);
  });

  test('Attempt to modify a task with logged creator and incorrect data', async () => {
    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('task', { id: task1.id }))
      .set('Cookie', sessionCookie)
      .type('form')
      .send({ name: null });
    expect(response.status).toBe(422);

    await task1.reload();
    expect(task1.name).not.toBeNull();
  });
});

describe('Delete a task', () => {
  let httpServer;
  let router;
  let models;

  let task1;
  let task2;

  let user1;
  let user1Password;
  let user2;
  let sessionCookie;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    user1Password = testHelpers.generateUserPassword();
    [user1, user2] = await Promise.all([
      testHelpers.createUser(models.User, user1Password),
      testHelpers.createUser(models.User, testHelpers.generateUserPassword()),
    ]);

    const taskStatus = await models.TaskStatus.findOne({ where: { name: 'Новая' } });

    const taskData1 = {
      ...generateTaskData(),
      creatorId: user1.id,
      assignedToId: user2.id,
      statusId: taskStatus.id,
    };
    const taskData2 = {
      ...generateTaskData(),
      creatorId: user2.id,
      statusId: taskStatus.id,
    };

    [task1, task2] = await Promise.all([
      models.Task.create(taskData1),
      models.Task.create(taskData2),
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

  test('Attempt to delete a task is not exist', async () => {
    sessionCookie = await testHelpers.userSingIn(httpServer, user1, user1Password);

    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('task', { id: -999 }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(404);
  });

  test('Attempt to delete a task without a logged user', async () => {
    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('task', { id: task1.id }));
    expect(response.status).toBe(403);

    await task1.reload();
    expect(task1.isActive).toBeTruthy();
  });

  test('Attempt to delete a task with a logged user', async () => {
    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('task', { id: task1.id }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(303);

    await task1.reload();
    expect(task1.isActive).toBeFalsy();
  });

  test('Attempt to delete a task is created by another user', async () => {
    const response = await request(httpServer.getRequestHandler())
      .delete(router.url('task', { id: task2.id }))
      .set('Cookie', sessionCookie);
    expect(response.status).toBe(403);

    await task2.reload();
    expect(task2.isActive).toBeTruthy();
  });
});

describe('Create and modify task with tags', () => {
  let httpServer;
  let router;
  let models;

  let taskStatusNew;

  let tag1;
  let tag2;

  let task;

  let user;
  let userPassword;
  let sessionCookie;

  beforeAll(async (done) => {
    ({ httpServer, router, models } = await testHelpers.getAppComponents(initApplication()));

    userPassword = testHelpers.generateUserPassword();
    user = await testHelpers.createUser(models.User, userPassword);

    taskStatusNew = await models.TaskStatus.findOne({ where: { name: 'Новая' } });

    [tag1, tag2] = await Promise.all([
      models.Tag.create({ name: 'копыта' }),
      models.Tag.create({ name: 'рога' }),
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

  test('Create task with tags', async () => {
    const tagsString = 'копыта, ноги, руки';
    const taskData = generateTaskData();

    sessionCookie = await testHelpers.userSingIn(httpServer, user, userPassword);

    const response = await request(httpServer.getRequestHandler())
      .post(router.url('tasksIndex'))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ ...taskData, tags: tagsString, statusId: taskStatusNew.id });
    expect(response.status).toBe(303);

    task = await models.Task.findOne({ where: taskData });

    const allTags = await models.Tag.findAll();
    expect(_.map(allTags, 'name')).toEqual(expect.arrayContaining(['копыта', 'рога', 'ноги', 'руки']));
    expect(allTags).toHaveLength(4);

    const taskTags = await task.getTags();
    expect(taskTags).toHaveLength(3);
    expect(_.map(taskTags, 'name')).toEqual(expect.arrayContaining(['копыта', 'ноги', 'руки']));

    const tasksForTag1 = await tag1.getTasks();
    expect(tasksForTag1).toHaveLength(1);
    expect(tasksForTag1[0].equals(task)).toBeTruthy();

    const tasksForTag2 = await tag2.getTasks();
    expect(tasksForTag2).toHaveLength(0);
  });

  test('Modify task with tags', async () => {
    const tagsString = 'рога,        ';

    const response = await request(httpServer.getRequestHandler())
      .patch(router.url('task', { id: task.id }))
      .type('form')
      .set('Cookie', sessionCookie)
      .send({ tags: tagsString });
    expect(response.status).toBe(303);

    const allTags = await models.Tag.findAll();
    expect(_.map(allTags, 'name')).toEqual(expect.arrayContaining(['копыта', 'рога', 'ноги', 'руки']));
    expect(allTags).toHaveLength(4);

    const taskTags = await task.getTags();
    expect(taskTags).toHaveLength(1);
    expect(_.map(taskTags, 'name')).toEqual(expect.arrayContaining(['рога']));

    const tasksForTag1 = await tag1.getTasks();
    expect(tasksForTag1).toHaveLength(0);

    const tasksForTag2 = await tag2.getTasks();
    expect(tasksForTag2).toHaveLength(1);
    expect(tasksForTag2[0].equals(task)).toBeTruthy();
  });
});
