export const isSameUser = (loggedUser, modifiedUser) => !!loggedUser
  && (loggedUser.id === modifiedUser.id);

export default (routeName, httpMethod, logger) => {
  const isLoggedCurrentUser = (ctx) => {
    logger.mainProcessLog('%s | %s | Checking that current user is logged...', ctx.method, ctx.url);

    if (!ctx.state.currentUser) {
      logger.mainProcessLog('%s | %s | Current user is not logged. Access is denied', ctx.method, ctx.url);
      return false;
    }

    logger.mainProcessLog('%s | %s | Current user is logged. Access is allowed', ctx.method, ctx.url);
    return true;
  };

  const checkCurrentUserModifyBuiltInStatus = (ctx) => {
    logger.mainProcessLog("%s | %s | Checking that logged user is trying to modify built-in task's statuses...", ctx.method, ctx.url);
    if (ctx.state.resourceInstance.isBuiltIn) {
      logger.mainProcessLog("%s | %s | Logged user is trying to modify built-in task's status. Access is denied", ctx.method, ctx.url);
      return false;
    }

    logger.mainProcessLog("%s | %s | Logged user is trying to modify not built-in task's status. Access is allowed", ctx.method, ctx.url);
    return true;
  };

  const checkCurrentUserIsCreatorForTask = (ctx) => {
    logger.mainProcessLog('%s | %s | Checking that logged user is creator for modifiable task...', ctx.method, ctx.url);
    if (!ctx.state.currentUser.equals(ctx.state.resourceInstance.creator)) {
      logger.mainProcessLog('%s | %s | Logged user is not creator for modifiable task. Access for modify task is denied', ctx.method, ctx.url);
      return false;
    }

    logger.mainProcessLog('%s | %s | Logged user is creator for modifiable task. Access for modify task is allowed', ctx.method, ctx.url);
    return true;
  };

  const checkCurrentUserIsPerfomerForTask = (ctx) => {
    logger.mainProcessLog('%s | %s | Checking that logged user is perfomer for modifiable task...', ctx.method, ctx.url);
    if (!ctx.state.currentUser.equals(ctx.state.resourceInstance.assignedTo)) {
      logger.mainProcessLog('%s | %s | Logged user is not perfomer for modifiable task. Access for modify task is denied', ctx.method, ctx.url);
      return false;
    }

    logger.mainProcessLog('%s | %s | Logged user is perfomer for modifiable task. Access for modify task is allowed', ctx.method, ctx.url);
    return true;
  };

  const checkCurrentUserModifyHimself = currentUserGetter => (ctx) => {
    const currentUser = ctx.state[currentUserGetter];
    const modifiedUser = ctx.state.resourceInstance;
    logger.mainProcessLog('%s | %s | Checking that current user: %o has permission to modify user: %o', ctx.method, ctx.url, currentUser ? currentUser.get() : 'GUEST', modifiedUser.get());
    if (isSameUser(currentUser, modifiedUser)) {
      logger.mainProcessLog('%s | %s | Modifying is allowed', ctx.method, ctx.url);
      return true;
    }

    logger.mainProcessLog('%s | %s | Modifying is denied', ctx.method, ctx.url);
    return false;
  };

  const checkPermission = {
    user: {
      PATCH: ctx => checkCurrentUserModifyHimself('currentUser')(ctx),
      DELETE: ctx => checkCurrentUserModifyHimself('currentUser')(ctx),
    },
    userRestoreQuery: {
      GET: ctx => checkCurrentUserModifyHimself('userForRestore')(ctx),
    },
    userRestore: {
      PATCH: ctx => checkCurrentUserModifyHimself('userForRestore')(ctx),
    },
    taskStatusesIndex: {
      POST: isLoggedCurrentUser,
    },
    taskStatus: {
      PATCH: ctx => isLoggedCurrentUser(ctx) && checkCurrentUserModifyBuiltInStatus(ctx),
      DELETE: ctx => isLoggedCurrentUser(ctx) && checkCurrentUserModifyBuiltInStatus(ctx),
    },
    tasksIndex: {
      POST: isLoggedCurrentUser,
    },
    newTask: {
      GET: isLoggedCurrentUser,
    },
    myTasks: {
      GET: isLoggedCurrentUser,
    },
    tasksEdit: {
      GET: ctx => isLoggedCurrentUser(ctx)
        && (checkCurrentUserIsCreatorForTask(ctx) || checkCurrentUserIsPerfomerForTask(ctx)),
    },
    task: {
      PATCH: ctx => isLoggedCurrentUser(ctx)
        && (checkCurrentUserIsCreatorForTask(ctx) || checkCurrentUserIsPerfomerForTask(ctx)),
      DELETE: ctx => isLoggedCurrentUser(ctx) && checkCurrentUserIsCreatorForTask(ctx),
    },
  };

  return async (ctx, next) => {
    const check = checkPermission[routeName][httpMethod];

    if (!await check(ctx)) {
      ctx.throw(403);
    }

    await next();
  };
};
