import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';
import getAuthorizationMiddleware from '../middlwares/authtorization';

export default (router, models) => {
  const getRequestedTaskStatusMiddleware = async (ctx, next) => {
    ctx.taskStatus = await models.TaskStatus.findByPk(ctx.params.id, { rejectOnEmpty: true });
    await next();
  };

  router.get('taskStatusesIndex', '/task-statuses', async (ctx) => {
    const taskStatuses = await models.TaskStatus.findAll();
    const currentModifiedTaskStatus = models.TaskStatus.build();
    const viewData = {
      pageTitle: ctx.t('page-titles:taskStatuses.index'),
      taskStatuses,
      currentModifiedTaskStatus,
      errors: [],
    };
    ctx.render('task-statuses/index', viewData);
  });

  router.post(
    '/task-statuses',
    getAuthorizationMiddleware('taskStatusesIndex'),
    async (ctx) => {
      const taskStatus = models.TaskStatus.build(ctx.request.body);
      try {
        await taskStatus.save();

        ctx.flash = { message: ctx.t('flash-messages:taskStatuses.create', { taskStatus }) };
        makeRedirect(ctx, router.url('taskStatusesIndex'));
      } catch (err) {
        if (!(err instanceof taskStatus.sequelize.ValidationError)) {
          throw err;
        }

        const taskStatuses = await models.TaskStatus.findAll();
        const viewData = {
          pageTitle: ctx.t('page-titles:taskStatuses.index'),
          taskStatuses,
          currentModifiedTaskStatus: taskStatus,
        };
        renderFormErrors(ctx, err.errors, 'task-statuses/index', viewData);
      }
    },
  );

  router.patch(
    'taskStatus',
    '/task-statuses/:id',
    getRequestedTaskStatusMiddleware,
    getAuthorizationMiddleware('taskStatus'),
    async (ctx) => {
      const { taskStatus } = ctx;
      const previousName = taskStatus.name;

      try {
        await taskStatus.update(ctx.request.body);
        ctx.flash = { message: ctx.t('flash-messages:taskStatuses.update', { previousName, newName: taskStatus.name }) };
        makeRedirect(ctx, router.url('taskStatusesIndex'));
      } catch (err) {
        if (!(err instanceof taskStatus.sequelize.ValidationError)) {
          throw err;
        }
        const taskStatuses = await models.TaskStatus.findAll();
        const viewData = {
          pageTitle: ctx.t('page-titles:taskStatuses.index'),
          currentModifiedTaskStatus: taskStatus,
          taskStatuses,
        };
        renderFormErrors(ctx, err.errors, 'task-statuses/index', viewData);
      }
    },
  );

  router.delete(
    '/task-statuses/:id',
    getRequestedTaskStatusMiddleware,
    getAuthorizationMiddleware('taskStatus'),
    async (ctx) => {
      const { taskStatus } = ctx;
      const taskStatusName = taskStatus.name;

      try {
        await taskStatus.destroy();
        ctx.flash = { message: ctx.t('flash-messages:taskStatuses.delete', { taskStatusName }) };
        makeRedirect(ctx, router.url('taskStatusesIndex'));
      } catch (err) {
        if (!(err instanceof taskStatus.sequelize.ForeignKeyConstraintError)) {
          throw err;
        }
        const taskStatuses = await models.TaskStatus.findAll();
        const viewData = {
          pageTitle: ctx.t('page-titles:taskStatuses.index'),
          currentModifiedTaskStatus: taskStatus,
          taskStatuses,
        };
        const error = new Error(ctx.t('validation:TaskStatus.delete.linkedWithTasks'));
        renderFormErrors(ctx, [error], 'task-statuses/index', viewData, 424);
      }
    },
  );
};
