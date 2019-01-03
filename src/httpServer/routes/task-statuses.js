import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';
import checkUserPermissions from './helpers/check-user-permission';

const pageTitles = {
  index: 'Центр управления статусами задач',
};

export default (router, models, logger) => {
  const findRequestedTaskStatus = async (ctx) => {
    const { id } = ctx.params;

    logger.mainProcessLog("%s | %s | Find requested task's status with id: '%s'", ctx.method, ctx.url, id);

    const requestedTaskStatus = await models.TaskStatus.findByPk(id);
    if (!requestedTaskStatus) {
      logger.mainProcessLog("%s | %s | Requested task's status with id: '%s' has not been found", ctx.method, ctx.url, id);
      ctx.throw(404);
    }

    return requestedTaskStatus;
  };

  router.get('taskStatusesIndex', '/task-statuses', async (ctx) => {
    logger.mainProcessLog("%s | %s | Getting all task's statuses...", ctx.method, ctx.url);
    const taskStatuses = await models.TaskStatus.findAll();
    const viewData = {
      pageTitle: pageTitles.index,
      taskStatuses,
      errors: [],
      formData: [],
    };
    ctx.render('task-statuses/index', viewData);
  });

  router.post(
    '/task-statuses',
    async (ctx) => {
      logger.mainProcessLog("%s | %s | Creating task's status with parameters: %o", ctx.method, ctx.url, ctx.request.body);

      const { currentUser } = ctx.state;
      const createPermission = checkUserPermissions.canUserCreateAndModifyTaskStatus(currentUser);
      if (!createPermission) {
        ctx.throw(403);
      }

      const newTaskStatus = models.TaskStatus.build(ctx.request.body);
      try {
        await newTaskStatus.save();
      } catch (err) {
        if (!(err instanceof newTaskStatus.sequelize.ValidationError)) {
          throw err;
        }

        logger.mainProcessLog("%s | %s | Task's status with name: '%s' has not been created. Validate error:\n%O", ctx.method, ctx.url, ctx.request.body.name, err);

        const taskStatuses = await models.TaskStatus.findAll();
        const viewData = {
          pageTitle: pageTitles.index,
          taskStatuses,
        };

        renderFormErrors(ctx, err.errors, 'task-statuses/index', viewData);
        return;
      }

      logger.mainProcessLog("%s | %s | Task's status with name: '%s' has been successful created", ctx.method, ctx.url, ctx.request.body.name);

      ctx.flash = { message: `Статус задачи с названием: '${ctx.request.body.name}' был успешно создан` };
      makeRedirect(ctx, router.url('taskStatusesIndex'));
    },
  );

  router.patch(
    'taskStatus',
    '/task-statuses/:id',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const requestedTaskStatus = await findRequestedTaskStatus(ctx);

      const editPermission = checkUserPermissions
        .canUserCreateAndModifyTaskStatus(currentUser);
      if (!editPermission || requestedTaskStatus.isBuiltIn) {
        ctx.throw(403);
      }

      logger.mainProcessLog("%s | %s | Updating task's status with name: '%s' to: %o", ctx.method, ctx.url, requestedTaskStatus.name, ctx.request.body);

      const previousName = requestedTaskStatus.name;
      try {
        await requestedTaskStatus.update(ctx.request.body);
      } catch (err) {
        if (!(err instanceof requestedTaskStatus.sequelize.ValidationError)) {
          throw err;
        }
        logger.mainProcessLog("%s | %s | Task's status with name: '%s' has not been updated. Validate error:\n%O", ctx.method, ctx.url, requestedTaskStatus.name, err);

        const taskStatuses = await models.TaskStatus.findAll();
        const viewData = {
          pageTitle: pageTitles.index,
          taskStatusIdWithErrors: requestedTaskStatus.id,
          taskStatuses,
        };
        renderFormErrors(ctx, err.errors, 'task-statuses/index', viewData);
        return;
      }

      logger.mainProcessLog("%s | %s | Task's status with name: '%s' has been successful updated", ctx.method, ctx.url, requestedTaskStatus.name);

      ctx.flash = { message: `Статус задачи с названием: '${previousName}' был успешно обновлен на '${requestedTaskStatus.name}'` };
      makeRedirect(ctx, router.url('taskStatusesIndex'));
    },
  );

  router.delete(
    '/task-statuses/:id',
    async (ctx) => {
      const { currentUser } = ctx.state;
      const requestedTaskStatus = await findRequestedTaskStatus(ctx);

      const editPermission = checkUserPermissions
        .canUserCreateAndModifyTaskStatus(currentUser);
      if (!editPermission || requestedTaskStatus.isBuiltIn) {
        ctx.throw(403);
      }

      logger.mainProcessLog("%s | %s | Deleting task's status with name: '%s'", ctx.method, ctx.url, requestedTaskStatus.name);

      const taskStatusName = requestedTaskStatus.name;
      try {
        await requestedTaskStatus.destroy();
      } catch (err) {
        if (!(err instanceof requestedTaskStatus.sequelize.ForeignKeyConstraintError)) {
          throw err;
        }
        const taskStatuses = await models.TaskStatus.findAll();
        const viewData = {
          pageTitle: pageTitles.index,
          taskStatusIdWithErrors: requestedTaskStatus.id,
          taskStatuses,
        };
        const error = new Error('С данным статусом имеются связанные задачи. Сначала смените статус в этих задачах');
        renderFormErrors(ctx, [error], 'task-statuses/index', viewData, 424);
        return;
      }

      logger.mainProcessLog("%s | %s | Task's status with name: '%s' has been successful deleted", ctx.method, ctx.url, taskStatusName);

      ctx.flash = { message: `Статус задачи с названием: '${taskStatusName}' был успешно удален` };
      makeRedirect(ctx, router.url('taskStatusesIndex'));
    },
  );
};
