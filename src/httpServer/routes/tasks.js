import _ from 'lodash';
import checkResourceIsExistAndGetInstance from '../middlwares/resource-exist-check';
import checkUserPermission from '../middlwares/check-user-permission';
import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';

const pageTitles = {
  filteredByTag: tagName => `Просмотр задач, связанных с тегом '${tagName}'`,
  filteredByStatus: statusName => `Просмотр задач, находящихся в статусе '${statusName}'`,
  filteredByPerfomer: perfomerName => `Просмотр задач, исполняемых пользователем '${perfomerName}'`,
  index: 'Центр управления задачами',
  myTasks: 'Мои задачи',
  newTask: 'Создание новой задачи',
  editTask: 'Редактирование задачи',
};

const flashMessages = {
  createdTask: taskName => `Задача с именем '${taskName}' была успешно создана`,
  updatedTask: taskName => `Задача с именем '${taskName}' была успешно обновлена`,
  deletedTask: taskName => `Задача с именем '${taskName}' была успешно удалена`,
};

export default (router, models, logger) => {
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

  const getTagsStringForTagsList = tagsList => _(tagsList)
    .map('name')
    .join(', ');

  const getDataForSelectsMenu = async () => {
    const [taskStatuses, users] = await Promise.all([
      await models.TaskStatus.scope('active').findAll(),
      await models.User.scope('active').findAll(),
    ]);

    return { taskStatuses, users };
  };

  router.get('tasksIndex', '/tasks', async (ctx) => {
    const gettersOfFilteredTasks = [
      {
        check: query => !!query.tag,
        getFilteredTasksAndFilterElement: async ({ tag }) => {
          const tagInstance = await models.Tag.findOne({ where: { name: tag } });
          const tasks = tagInstance ? await tagInstance.getTasks({
            scope: ['active'],
            include: [{ all: true }],
          }) : [];
          return { tasks, filterElement: tagInstance || { name: tag } };
        },
        getPageTitle: ({ name }) => pageTitles.filteredByTag(name),
      },
      {
        check: query => !!query.statusId,
        getFilteredTasksAndFilterElement: async ({ statusId }) => {
          const status = await models.TaskStatus.findByPk(statusId);
          const tasks = status ? await status.getTasks({
            scope: ['active'],
            include: [{ all: true }],
          }) : [];
          return { tasks, filterElement: status };
        },
        getPageTitle: ({ name }) => pageTitles.filteredByStatus(name),
      },
      {
        check: query => !!query.perfomerId,
        getFilteredTasksAndFilterElement: async ({ perfomerId }) => {
          const perfomer = await models.User.findByPk(perfomerId);
          const tasks = (
            perfomer ? await perfomer.getAssignedTasks({
              scope: ['active'],
              include: [{ all: true }],
            }) : []
          );
          return { tasks, filterElement: perfomer };
        },
        getPageTitle: ({ fullName }) => pageTitles.filteredByPerfomer(fullName),
      },
      {
        check: _.constant(true),
        getFilteredTasksAndFilterElement: async () => {
          const tasks = await models.Task.scope('active').findAll({ include: [{ all: true }] });
          return { tasks, filterElement: null };
        },
        getPageTitle: _.constant(pageTitles.index),
      },
    ];

    const {
      getFilteredTasksAndFilterElement,
      getPageTitle,
    } = _.find(gettersOfFilteredTasks, getter => getter.check(ctx.query));

    const { tasks, filterElement } = await getFilteredTasksAndFilterElement(ctx.query);
    const pageTitle = getPageTitle(filterElement);

    const viewData = {
      pageTitle,
      tasks,
      selectsMenuData: await getDataForSelectsMenu(),
    };

    ctx.render('tasks/index', viewData);
  });

  router.get(
    'myTasks',
    '/tasks/my',
    checkUserPermission('myTasks', 'GET', logger),
    async (ctx) => {
      const [createdTasks, assignedTasks] = await Promise.all([
        await ctx.state.currentUser.getCreatedTasks({
          scope: ['active'],
          include: [{ all: true }],
        }),
        await ctx.state.currentUser.getAssignedTasks({
          scope: ['active'],
          include: [{ all: true }],
        }),
      ]);

      const viewData = {
        pageTitle: pageTitles.myTasks,
        selectsMenuData: await getDataForSelectsMenu(),
        createdTasks,
        assignedTasks,
      };

      ctx.render('tasks/my-tasks.pug', viewData);
    },
  );

  router.get(
    'newTask',
    '/tasks/new',
    checkUserPermission('newTask', 'GET', logger),
    async (ctx) => {
      const viewData = {
        pageTitle: pageTitles.newTask,
        errors: [],
        formData: {},
        selectsMenuData: await getDataForSelectsMenu(),
        isFullEditableForm: true,
      };

      ctx.render('tasks/new', viewData);
    },
  );

  router.post(
    '/tasks',
    checkUserPermission('tasksIndex', 'POST', logger),
    async (ctx) => {
      const taskData = {
        ...ctx.request.body,
        statusId: ctx.request.body.statusId || models.TaskStatus.defaultValue.id,
        assignedToId: ctx.request.body.assignedToId || null,
        creatorId: ctx.state.currentUser.id,
      };
      const newTask = models.Task.build(taskData);
      logger.mainProcessLog('%s | %s | Creating task with parameters:\n%O', ctx.method, ctx.url, taskData);

      try {
        await newTask.save();
      } catch (err) {
        if (err instanceof newTask.sequelize.ValidationError) {
          logger.mainProcessLog("%s | %s | Task with name: '%s' has not been created. Validate error:\n%O", ctx.method, ctx.url, ctx.request.body.name, err);
          const viewData = {
            pageTitle: pageTitles.newTask,
            selectsMenuData: await getDataForSelectsMenu(),
            isFullEditableForm: true,
          };

          renderFormErrors(ctx, err.errors, 'tasks/new', viewData);
          return;
        }
        throw err;
      }

      logger.mainProcessLog("%s | %s | Task with name: '%s' has been successful created. Parsing and setting tags for task...", ctx.method, ctx.url, ctx.request.body.name);
      await setTagsForTask(ctx.request.body.tags, newTask);
      logger.mainProcessLog("%s | %s | Tags for task with name: '%s' have been successful setted", ctx.method, ctx.url, ctx.request.body.name);

      ctx.flash = { message: flashMessages.createdTask(newTask.name) };
      makeRedirect(ctx, router.url('tasksIndex'));
    },
  );

  router.get(
    'tasksEdit',
    '/tasks/:id/edit',
    checkResourceIsExistAndGetInstance(models.Task.scope('active'), logger),
    checkUserPermission('tasksEdit', 'GET', logger),
    async (ctx) => {
      const assignedToId = (
        ctx.state.resourceInstance.assignedTo ? ctx.state.resourceInstance.assignedTo.id : null
      );

      const formData = {
        name: ctx.state.resourceInstance.name,
        description: ctx.state.resourceInstance.description,
        assignedToId,
        statusId: ctx.state.resourceInstance.status.id,
        tags: getTagsStringForTagsList(ctx.state.resourceInstance.Tags),
      };

      const viewData = {
        pageTitle: pageTitles.editTask,
        errors: [],
        formData,
        selectsMenuData: await getDataForSelectsMenu(),
        isFullEditableForm: ctx.state.resourceInstance.creator.equals(ctx.state.currentUser),
      };

      ctx.render('tasks/edit', viewData);
    },
  );

  router.patch(
    'task',
    '/tasks/:id',
    checkResourceIsExistAndGetInstance(models.Task.scope('active'), logger),
    checkUserPermission('task', 'PATCH', logger),
    async (ctx, next) => {
      if (ctx.state.currentUser.equals(ctx.state.resourceInstance.assignedTo)) {
        ctx.request.body = _.pick(ctx.request.body, 'statusId');
        await next();
        return;
      }
      ctx.request.body = _.omit(ctx.request.body, 'creatorId');
      await next();
    },
    async (ctx) => {
      logger.mainProcessLog("%s | %s | Updating task with name: '%s' to:\n%O", ctx.method, ctx.url, ctx.state.resourceInstance.name, ctx.request.body);
      try {
        await ctx.state.resourceInstance.update(ctx.request.body);
      } catch (err) {
        if (err instanceof ctx.state.resourceInstance.sequelize.ValidationError) {
          logger.mainProcessLog("%s | %s | Task with name: '%s' has not been updated. Validate error:\n%O", ctx.method, ctx.url, ctx.state.resourceInstance.name, err);

          const viewData = {
            pageTitle: pageTitles.editTask,
            selectsMenuData: await getDataForSelectsMenu(),
            isFullEditableForm: ctx.state.currentUser.equals(ctx.state.resourceInstance.creator),
          };
          renderFormErrors(ctx, err.errors, 'tasks/edit', viewData);
          return;
        }
        throw err;
      }

      logger.mainProcessLog("%s | %s | Task with name: '%s' has been successful updated. Parsing and setting tags for task...", ctx.method, ctx.url, ctx.state.resourceInstance.name);
      await setTagsForTask(ctx.request.body.tags, ctx.state.resourceInstance);

      logger.mainProcessLog("%s | %s | Tags for task with name: '%s' have been successful setted", ctx.method, ctx.url, ctx.state.resourceInstance.name);

      ctx.flash = { message: flashMessages.updatedTask(ctx.state.resourceInstance.name) };
      makeRedirect(ctx, router.url('tasksIndex'));
    },
  );

  router.delete(
    '/tasks/:id',
    checkResourceIsExistAndGetInstance(models.Task.scope('active'), logger),
    checkUserPermission('task', 'DELETE', logger),
    async (ctx) => {
      logger.mainProcessLog("%s | %s | Deleting task with name: '%s'", ctx.method, ctx.url, ctx.state.resourceInstance.name);
      ctx.state.resourceInstance.delete();
      await ctx.state.resourceInstance.save();

      logger.mainProcessLog("%s | %s | Task with name: '%s' has been successful deleted", ctx.method, ctx.url, ctx.state.resourceInstance.name);
      ctx.flash = { message: flashMessages.deletedTask(ctx.state.resourceInstance.name) };
      makeRedirect(ctx, router.url('tasksIndex'));
    },
  );
};
