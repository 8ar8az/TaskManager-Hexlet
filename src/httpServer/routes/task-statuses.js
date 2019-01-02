import _ from 'lodash';
import makeRedirect from './helpers/redirect';
import renderFormErrors from './helpers/form-errors-render';
import checkResourceIsExistAndGetInstance from '../middlwares/resource-exist-check';
import checkUserPermission from '../middlwares/check-user-permission';

const pageTitles = {
  index: 'Центр управления статусами задач',
};

const flashMessages = {
  restoredStatus: name => `Статус задачи с названием: '${name}' был успешно восстановлен`,
  createdStatus: name => `Статус задачи с названием: '${name}' был успешно создан`,
  updatedStatus: (previousName, newName) => `Статус задачи с названием: '${previousName}' был успешно обновлен на '${newName}'`,
  deletedStatus: name => `Статус задачи с названием: '${name}' был успешно удален`,
};

const errorMessages = {
  deleteError: 'С данным статусом имеются связанные активые задачи. Сначала смените статус в этих задачах',
};

export default (router, models, logger) => {
  router.get('taskStatusesIndex', '/task-statuses', async (ctx) => {
    logger.mainProcessLog("%s | %s | Getting all task's statuses...", ctx.method, ctx.url);
    const taskStatuses = await models.TaskStatus.scope('active').findAll();
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
    checkUserPermission('taskStatusesIndex', 'POST', logger),
    async (ctx) => {
      logger.mainProcessLog("%s | %s | Creating task's status with parameters:\n%O", ctx.method, ctx.url, ctx.request.body);

      const deletedTaskStatus = await models.TaskStatus.scope('deleted').findOne({ where: ctx.request.body });

      if (deletedTaskStatus) {
        logger.mainProcessLog("%s | %s | Task's status with name: '%s' has been deleted early. Restoring...", ctx.method, ctx.url, ctx.request.body.name);

        deletedTaskStatus.restore();
        await deletedTaskStatus.save();

        logger.mainProcessLog("%s | %s | Task's status with name: '%s' has been successful restored", ctx.method, ctx.url, ctx.request.body.name);

        ctx.flash = { message: flashMessages.restoredStatus(ctx.request.body.name) };
      } else {
        const newTaskStatus = models.TaskStatus.build(ctx.request.body);

        try {
          await newTaskStatus.save();

          logger.mainProcessLog("%s | %s | Task's status with name: '%s' has been successful created", ctx.method, ctx.url, ctx.request.body.name);

          ctx.flash = { message: flashMessages.createdStatus(ctx.request.body.name) };
        } catch (err) {
          if (err instanceof newTaskStatus.sequelize.ValidationError) {
            logger.mainProcessLog("%s | %s | Task's status with name: '%s' has not been created. Validate error:\n%O", ctx.method, ctx.url, ctx.request.body.name, err);

            const taskStatuses = await models.TaskStatus.scope('active').findAll();
            const viewData = {
              pageTitle: pageTitles.index,
              idStatusWithErrors: null,
              taskStatuses,
            };

            renderFormErrors(ctx, err.errors, 'task-statuses/index', viewData);
            return;
          }
          throw err;
        }
      }

      makeRedirect(ctx, router.url('taskStatusesIndex'));
    },
  );

  router.patch(
    'taskStatus',
    '/task-statuses/:id',
    checkResourceIsExistAndGetInstance(models.TaskStatus.scope('active'), logger),
    checkUserPermission('taskStatus', 'PATCH', logger),
    async (ctx) => {
      logger.mainProcessLog("%s | %s | Updating task's status with name: '%s' to:\n%O", ctx.method, ctx.url, ctx.state.resourceInstance.name, ctx.request.body);

      const previousName = ctx.state.resourceInstance.name;
      try {
        await ctx.state.resourceInstance.update(ctx.request.body);
      } catch (err) {
        if (err instanceof ctx.state.resourceInstance.sequelize.ValidationError) {
          logger.mainProcessLog("%s | %s | Task's status with name: '%s' has not been updated. Validate error:\n%O", ctx.method, ctx.url, ctx.state.resourceInstance.name, err);

          const taskStatuses = await models.TaskStatus.scope('active').findAll();
          const viewData = {
            pageTitle: pageTitles.index,
            idStatusWithErrors: ctx.state.resourceInstance.id,
            taskStatuses,
          };
          renderFormErrors(ctx, err.errors, 'task-statuses/index', viewData);
          return;
        }
        throw err;
      }

      logger.mainProcessLog("%s | %s | Task's status with name: '%s' has been successful updated", ctx.method, ctx.url, ctx.state.resourceInstance.name);

      ctx.flash = { message: flashMessages.updatedStatus(previousName, ctx.request.body.name) };
      makeRedirect(ctx, router.url('taskStatusesIndex'));
    },
  );

  router.delete(
    '/task-statuses/:id',
    checkResourceIsExistAndGetInstance(models.TaskStatus.scope('active'), logger),
    checkUserPermission('taskStatus', 'DELETE', logger),
    async (ctx) => {
      logger.mainProcessLog("%s | %s | Deleting task's status with name: '%s'", ctx.method, ctx.url, ctx.state.resourceInstance.name);

      const activeTasksLinkedWithStatus = _.filter(ctx.state.resourceInstance.tasks, 'isActive');
      if (!_.isEmpty(activeTasksLinkedWithStatus)) {
        const error = new Error(errorMessages.deleteError);

        const taskStatuses = await models.TaskStatus.scope('active').findAll();
        const viewData = {
          pageTitle: pageTitles.index,
          idStatusWithErrors: ctx.state.resourceInstance.id,
          taskStatuses,
        };

        renderFormErrors(ctx, [error], 'task-statuses/index', viewData, 424);
        return;
      }

      ctx.state.resourceInstance.delete();
      await ctx.state.resourceInstance.save();

      logger.mainProcessLog("%s | %s | Task's status with name: '%s' has been successful deleted", ctx.method, ctx.url, ctx.state.resourceInstance.name);
      ctx.flash = { message: flashMessages.deletedStatus(ctx.state.resourceInstance.name) };
      makeRedirect(ctx, router.url('taskStatusesIndex'));
    },
  );
};
