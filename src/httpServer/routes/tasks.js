import _ from 'lodash';
import checkUserPermissions from './helpers/check-user-permission';
import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';

const pageTitles = {
  index: 'Центр управления задачами',
  myTasks: 'Мои задачи',
  newTask: 'Создание новой задачи',
  editTask: 'Редактирование задачи',
};

export default (router, models, logger) => {
  const findRequestedTask = async (ctx) => {
    const { id } = ctx.params;

    logger.mainProcessLog("%s | %s | Find requested task with id: '%s'", ctx.method, ctx.url, id);

    const requestedTask = await models.Task.findByPk(id, { include: [{ all: true }] });
    if (!requestedTask) {
      logger.mainProcessLog("%s | %s | Requested task with id: '%s' has not been found", ctx.method, ctx.url, id);
      ctx.throw(404);
    }

    return requestedTask;
  };

  const setTagsForTask = async (tagsString, task) => {
    logger.mainProcessLog("Parse string of tags: '%s' for task with name: '%s'", tagsString, task.name);
    const tagNames = _(tagsString)
      .split(',')
      .map(_.trim)
      .compact()
      .uniq()
      .value();

    const alreadyExistTags = await models.Tag.findAll({ where: { name: tagNames } });
    const alreadyExistTagsNames = _.map(alreadyExistTags, 'name');
    logger.mainProcessLog('Tags which already exist: %o', alreadyExistTagsNames);

    const tagNamesForCreating = _.difference(tagNames, alreadyExistTagsNames);
    await models.Tag.bulkCreate(_.map(tagNamesForCreating, name => ({ name })));
    const createdTags = await models.Tag.findAll({ where: { name: tagNamesForCreating } });
    logger.mainProcessLog('Tags which created now: %o', _.map(createdTags, 'name'));

    await task.setTags([...alreadyExistTags, ...createdTags]);
  };

  router.get('tasksIndex', '/tasks', async (ctx) => {
  /*     const gettersOfFilteredTasks = [
      {
        check: query => !!query.tagName,
        getFilteredTasks: async ({ tagName }) => {
          const tag = await models.Tag.findOne({ where: { name: tagName } });
          const tasks = tag ? await tag.getTasks({
            include: [{ all: true }],
          }) : [];
          return tasks;
        },
        getPageTitle: ({ tagName }) => pageTitles.filteredByTag(tagName),
      },
      {
        check: query => !!query.statusId,
        getFilteredTasks: async ({ statusId }) => {
          const status = await models.TaskStatus.findByPk(statusId);
          const tasks = status ? await status.getTasks({
            include: [{ all: true }],
          }) : [];
          return tasks;
        },
        getPageTitle: async ({ statusId }) => {
          const status = await models.TaskStatus.findByPk(statusId);
          return pageTitles.filteredByStatus(status.name);
        },
      },
      {
        check: query => !!query.perfomerId,
        getFilteredTasks: async ({ perfomerId }) => {
          const perfomer = await models.User.findByPk(perfomerId);
          const tasks = perfomer ? await perfomer.getAssignedTasks({
            include: [{ all: true }],
          }) : [];
          return tasks;
        },
        getPageTitle: async ({ perfomerId }) => {
          const perfomer = await models.User.findByPk(perfomerId);
          return pageTitles.filteredByPerfomer(perfomer.fullName);
        },
      },
      {
        check: _.constant(true),
        getFilteredTasks: async () => {
          const tasks = await models.Task.findAll({ include: [{ all: true }] });
          return tasks;
        },
        getPageTitle: _.constant(pageTitles.index),
      },
    ];

    const { getFilteredTasks, getPageTitle } = _.find(
      gettersOfFilteredTasks,
      getter => getter.check(ctx.query),
    );

    const tasks = await getFilteredTasks(ctx.query);
    const pageTitle = await getPageTitle(ctx.query);
 */

    const { tagName: tagNameQuery, ...statusIdAndAssignedToIdQuery } = ctx.query;

    let tasks;
    if (tagNameQuery) {
      const tagForFilter = await models.Tag.findOne({ where: { name: tagNameQuery } });
      tasks = await tagForFilter.getTasks({
        where: statusIdAndAssignedToIdQuery,
        include: [{ all: true }],
      });
    } else {
      tasks = await models.Task.findAll({
        where: statusIdAndAssignedToIdQuery,
        include: [{ all: true }],
      });
    }

    const queryStatus = await models.TaskStatus.findByPk(statusIdAndAssignedToIdQuery.statusId);
    const queryAssignedTo = await models.User.findByPk(statusIdAndAssignedToIdQuery.assignedToId);

    const pageTitlePartForTagFiltration = tagNameQuery ? `тег: '${tagNameQuery}'` : '';
    const pageTitlePartForStatusFiltration = statusIdAndAssignedToIdQuery.statusId ? `статус задачи: '${queryStatus.name}'` : '';
    const pageTitlePartForAssignedToFiltration = statusIdAndAssignedToIdQuery.assignedToId ? `исполнитель задачи: '${queryAssignedTo.fullName}'` : '';

    const pageTitle = _.isEmpty(ctx.query) ? pageTitles.index : `Фильтрация задач по параметрам - ${_.compact([
      pageTitlePartForTagFiltration,
      pageTitlePartForStatusFiltration,
      pageTitlePartForAssignedToFiltration,
    ]).join('; ')}`;

    const taskStatuses = await models.TaskStatus.findAll();
    const users = await models.User.scope('active').findAll();

    const viewData = {
      pageTitle,
      tasks,
      taskStatuses,
      users,
    };

    ctx.render('tasks/index', viewData);
  });

  router.get(
    'myTasks',
    '/tasks/my',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const getMyTasksPermission = checkUserPermissions
        .canUserCreateAndHaveHimselfTasks(currentUser);

      if (!getMyTasksPermission) {
        ctx.throw(403);
      }

      const createdTasks = await currentUser.getCreatedTasks({ include: [{ all: true }] });
      const assignedTasks = await currentUser.getAssignedTasks({ include: [{ all: true }] });
      const taskStatuses = await models.TaskStatus.findAll();
      const users = await models.User.scope('active').findAll();

      const viewData = {
        pageTitle: pageTitles.myTasks,
        taskStatuses,
        users,
        createdTasks,
        assignedTasks,
      };

      ctx.render('tasks/my-tasks.pug', viewData);
    },
  );

  router.get(
    'newTask',
    '/tasks/new',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const createTaskPermission = checkUserPermissions
        .canUserCreateAndHaveHimselfTasks(currentUser);

      if (!createTaskPermission) {
        ctx.throw(403);
      }

      const taskStatuses = await models.TaskStatus.findAll();
      const users = await models.User.scope('active').findAll();

      const viewData = {
        pageTitle: pageTitles.newTask,
        errors: [],
        formData: {},
        taskStatuses,
        users,
        fullEditPermission: true,
      };

      ctx.render('tasks/new', viewData);
    },
  );

  router.post(
    '/tasks',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const createTaskPermission = checkUserPermissions
        .canUserCreateAndHaveHimselfTasks(currentUser);

      if (!createTaskPermission) {
        ctx.throw(403);
      }

      const taskData = {
        ...ctx.request.body,
        statusId: ctx.request.body.statusId || models.TaskStatus.defaultValue.id,
        assignedToId: ctx.request.body.assignedToId || null,
        creatorId: currentUser.id,
      };

      logger.mainProcessLog('%s | %s | Creating task with parameters:\n%O', ctx.method, ctx.url, taskData);

      const newTask = models.Task.build(taskData);
      try {
        await newTask.save();
      } catch (err) {
        if (!(err instanceof newTask.sequelize.ValidationError)) {
          throw err;
        }
        logger.mainProcessLog("%s | %s | Task with name: '%s' has not been created. Validate error:\n%O", ctx.method, ctx.url, ctx.request.body.name, err);

        const taskStatuses = await models.TaskStatus.findAll();
        const users = await models.User.scope('active').findAll();

        const viewData = {
          pageTitle: pageTitles.newTask,
          taskStatuses,
          users,
          fullEditPermission: true,
        };

        renderFormErrors(ctx, err.errors, 'tasks/new', viewData);
        return;
      }

      logger.mainProcessLog("%s | %s | Task with name: '%s' has been successful created. Parsing and setting tags for task...", ctx.method, ctx.url, ctx.request.body.name);
      await setTagsForTask(ctx.request.body.tags, newTask);
      logger.mainProcessLog("%s | %s | Tags for task with name: '%s' have been successful setted", ctx.method, ctx.url, ctx.request.body.name);

      ctx.flash = { message: `Задача с именем '${newTask.name}' была успешно создана` };
      makeRedirect(ctx, router.url('tasksIndex'));
    },
  );

  router.get(
    'taskProfile',
    '/tasks/:id',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const requestedTask = await findRequestedTask(ctx);
      const modifyTaskPermission = checkUserPermissions
        .canUserModifyTask(currentUser, requestedTask);

      if (!modifyTaskPermission) {
        ctx.throw(403);
      }

      const assignedToId = requestedTask.assignedTo
        ? requestedTask.assignedTo.id : null;

      const formData = {
        name: requestedTask.name,
        description: requestedTask.description,
        assignedToId,
        statusId: requestedTask.status.id,
        tags: _(requestedTask.Tags).map('name').join(', '),
      };

      const taskStatuses = await models.TaskStatus.findAll();
      const users = await models.User.scope('active').findAll();

      const viewData = {
        pageTitle: pageTitles.editTask,
        errors: [],
        formData,
        taskStatuses,
        users,
        requestedTask,
        fullEditPermission: requestedTask.creator.equals(currentUser),
      };

      ctx.render('tasks/profile', viewData);
    },
  );

  router.patch(
    '/tasks/:id',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const requestedTask = await findRequestedTask(ctx);
      const modifyTaskPermission = checkUserPermissions
        .canUserModifyTask(currentUser, requestedTask);

      if (!modifyTaskPermission) {
        ctx.throw(403);
      }

      logger.mainProcessLog("%s | %s | Updating task with name: '%s' to: %o", ctx.method, ctx.url, requestedTask.name, ctx.request.body);

      const normalizeRequestBody = (requestBody) => {
        if (currentUser.equals(requestedTask.creator)) {
          return _.omit(requestBody, 'creatorId');
        }

        return _.pick(requestBody, 'statusId');
      };

      ctx.request.body = normalizeRequestBody(ctx.request.body);

      logger.mainProcessLog('%s | %s | Modified request body: %o', ctx.method, ctx.url, ctx.request.body);

      try {
        await requestedTask.update(ctx.request.body);
      } catch (err) {
        if (!(err instanceof requestedTask.sequelize.ValidationError)) {
          throw err;
        }
        logger.mainProcessLog("%s | %s | Task with name: '%s' has not been updated. Validate error:\n%O", ctx.method, ctx.url, requestedTask.name, err);

        const taskStatuses = await models.TaskStatus.findAll();
        const users = await models.User.scope('active').findAll();

        const viewData = {
          pageTitle: pageTitles.editTask,
          taskStatuses,
          users,
          requestedTask,
          fullEditPermission: requestedTask.creator.equals(currentUser),
        };
        renderFormErrors(ctx, err.errors, 'tasks/profile', viewData);
        return;
      }

      logger.mainProcessLog("%s | %s | Task with name: '%s' has been successful updated. Parsing and setting tags for task...", ctx.method, ctx.url, requestedTask.name);
      await setTagsForTask(ctx.request.body.tags, requestedTask);

      logger.mainProcessLog("%s | %s | Tags for task with name: '%s' have been successful setted", ctx.method, ctx.url, requestedTask.name);

      ctx.flash = { message: `Задача с именем '${requestedTask.name}' была успешно обновлена` };
      makeRedirect(ctx, router.url('tasksIndex'));
    },
  );

  router.delete(
    '/tasks/:id',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const requestedTask = await findRequestedTask(ctx);
      const deleteTaskPermission = checkUserPermissions
        .canUserDeleteTask(currentUser, requestedTask);

      if (!deleteTaskPermission) {
        ctx.throw(403);
      }

      logger.mainProcessLog("%s | %s | Deleting task with name: '%s'", ctx.method, ctx.url, requestedTask.name);
      await requestedTask.destroy();

      logger.mainProcessLog("%s | %s | Task with name: '%s' has been successful deleted", ctx.method, ctx.url, requestedTask.name);
      ctx.flash = { message: `Задача с именем '${requestedTask.name}' была успешно удалена` };
      makeRedirect(ctx, router.url('tasksIndex'));
    },
  );
};
