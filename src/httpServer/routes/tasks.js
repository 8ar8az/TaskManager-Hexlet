import _ from 'lodash';
import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';
import getAuthorizationMiddleware, { isUserCreatorForTask } from '../middlwares/authtorization';

export default (router, models) => {
  const getRequestedTaskMiddleware = async (ctx, next) => {
    ctx.task = await models.Task.findByPk(
      ctx.params.id,
      { include: [{ all: true }], rejectOnEmpty: true },
    );

    await next();
  };

  const setTagsForTask = async (tagsString, task) => {
    const tagNames = _(tagsString)
      .split(',')
      .map(_.trim)
      .compact()
      .uniq()
      .value();

    await task.sequelize.transaction(async (t) => {
      const alreadyExistTags = await models.Tag.findAll({
        where: { name: tagNames },
        transaction: t,
      });

      const alreadyExistTagsNames = _.map(alreadyExistTags, 'name');
      const tagNamesForCreating = _.difference(tagNames, alreadyExistTagsNames);

      const createdTags = await models.Tag.bulkCreate(
        _.map(tagNamesForCreating, name => ({ name })),
        { transaction: t },
      );

      await task.setTags([...alreadyExistTags, ...createdTags], { transaction: t });
    });
  };

  router.get('tasksIndex', '/tasks', async (ctx) => {
    const { tagName, statusId, assignedToId } = ctx.query;
    const filteredTasks = await models.Task.findAll({
      include: [
        {
          model: models.Tag,
          where: tagName ? { name: tagName } : null,
        },
        {
          model: models.TaskStatus,
          as: 'status',
          where: statusId ? { id: statusId } : null,
        },
        {
          model: models.User,
          as: 'assignedTo',
          where: assignedToId ? { id: assignedToId } : null,
        },
      ],
    });

    const taskStatuses = await models.TaskStatus.findAll();
    const users = await models.User.scope('active').findAll();

    const viewData = {
      pageTitle: ctx.t('page-titles:tasks.index.all'),
      tasks: await Promise.all(_.invokeMap(filteredTasks, 'reload', { include: [{ all: true }] })),
      taskStatuses,
      users,
    };

    ctx.render('tasks/index', viewData);
  });

  router.get(
    'tasksMy',
    '/tasks/my',
    getAuthorizationMiddleware('tasksMy'),
    async (ctx) => {
      const { currentUser } = ctx.state;

      const createdTasks = await currentUser.getCreatedTasks({ include: [{ all: true }] });
      const assignedTasks = await currentUser.getAssignedTasks({ include: [{ all: true }] });

      const taskStatuses = await models.TaskStatus.findAll();
      const users = await models.User.scope('active').findAll();

      const viewData = {
        pageTitle: ctx.t('page-titles:tasks.my'),
        taskStatuses,
        users,
        createdTasks,
        assignedTasks,
      };

      ctx.render('tasks/my.pug', viewData);
    },
  );

  router.get(
    'tasksNew',
    '/tasks/new',
    getAuthorizationMiddleware('tasksNew'),
    async (ctx) => {
      const task = await models.Task.build();
      const taskStatuses = await models.TaskStatus.findAll();
      const users = await models.User.scope('active').findAll();

      const viewData = {
        pageTitle: ctx.t('page-titles:tasks.new'),
        errors: [],
        task,
        taskStatuses,
        users,
      };

      ctx.render('tasks/new', viewData);
    },
  );

  router.post(
    '/tasks',
    getAuthorizationMiddleware('tasksIndex'),
    async (ctx) => {
      const { currentUser } = ctx.state;
      const taskData = {
        ...ctx.request.body,
        statusId: ctx.request.body.statusId || models.TaskStatus.defaultValue.id,
        assignedToId: ctx.request.body.assignedToId || null,
        creatorId: currentUser.id,
      };

      const task = models.Task.build(taskData);
      try {
        await task.save();

        await setTagsForTask(ctx.request.body.tags, task);

        ctx.flash = { message: ctx.t('flash-messages:tasks.create', { task }) };
        makeRedirect(ctx, router.url('tasksIndex'));
      } catch (err) {
        if (!(err instanceof task.sequelize.ValidationError)) {
          throw err;
        }
        const taskStatuses = await models.TaskStatus.findAll();
        const users = await models.User.scope('active').findAll();

        const viewData = {
          pageTitle: ctx.t('page-titles:tasks.new'),
          taskStatuses,
          users,
          task,
        };
        renderFormErrors(ctx, err.errors, 'tasks/new', viewData);
      }
    },
  );

  router.get(
    'tasksProfile',
    '/tasks/:id',
    getRequestedTaskMiddleware,
    getAuthorizationMiddleware('tasksProfile'),
    async (ctx) => {
      const { task } = ctx;
      const taskStatuses = await models.TaskStatus.findAll();
      const users = await models.User.scope('active').findAll();

      const viewData = {
        pageTitle: ctx.t('page-titles:tasks.profile'),
        errors: [],
        taskStatuses,
        users,
        task,
        isUserCreatorForTask,
      };

      ctx.render('tasks/profile', viewData);
    },
  );

  router.patch(
    '/tasks/:id',
    getRequestedTaskMiddleware,
    getAuthorizationMiddleware('tasksProfile'),
    async (ctx) => {
      const { currentUser } = ctx.state;
      const { task } = ctx;

      if (ctx.request.body.assignedToId === '') {
        ctx.request.body.assignedToId = null;
      }

      try {
        await task.update(
          ctx.request.body,
          { fields: isUserCreatorForTask(currentUser, task) ? ['name', 'description', 'statusId', 'assignedToId'] : ['statusId'] },
        );

        await setTagsForTask(ctx.request.body.tags, task);

        ctx.flash = { message: ctx.t('flash-messages:tasks.update', { task }) };
        makeRedirect(ctx, router.url('tasksIndex'));
      } catch (err) {
        if (!(err instanceof task.sequelize.ValidationError)) {
          throw err;
        }

        const taskStatuses = await models.TaskStatus.findAll();
        const users = await models.User.scope('active').findAll();

        const viewData = {
          pageTitle: ctx.t('page-titles:tasks.profile'),
          taskStatuses,
          users,
          task,
          isUserCreatorForTask,
        };
        renderFormErrors(ctx, err.errors, 'tasks/profile', viewData);
      }
    },
  );

  router.delete(
    '/tasks/:id',
    getRequestedTaskMiddleware,
    getAuthorizationMiddleware('tasksProfile'),
    async (ctx) => {
      const { task } = ctx;
      const taskName = task.name;

      await task.destroy();

      ctx.flash = { message: ctx.t('flash-messages:tasks.delete', { taskName }) };
      makeRedirect(ctx, router.url('tasksIndex'));
    },
  );
};
