export const isSameUser = (user1, user2) => (
  !!user1 && !!user2 && (user1.id === user2.id)
);

export const isUserCreatorForTask = (user, task) => task.creator.equals(user);
export const isUserAssignedToForTask = (user, task) => (
  !!task.assignedTo && task.assignedTo.equals(user)
);

export default routeName => async (ctx, next) => {
  const isCurrentUserAndRequestedUserSame = () => isSameUser(ctx.state.currentUser, ctx.user);
  const isRestorableUserAndRequestedUserSame = () => isSameUser(ctx.state.restorableUser, ctx.user);

  const isCurrentUserLoggedIn = () => !!ctx.state.currentUser;

  const isTryingModifyBuiltInStatus = () => ctx.taskStatus.isBuiltIn;

  const canCurrentUserModifyTask = () => isUserCreatorForTask(ctx.state.currentUser, ctx.task)
    || isUserAssignedToForTask(ctx.state.currentUser, ctx.task);

  const canCurrentUserDeleteTask = () => isUserCreatorForTask(ctx.state.currentUser, ctx.task);

  const permissionCheckers = {
    usersProfile: {
      PATCH: isCurrentUserAndRequestedUserSame,
      DELETE: isCurrentUserAndRequestedUserSame,
    },
    usersQueryToRestore: {
      GET: isRestorableUserAndRequestedUserSame,
    },
    usersRestore: {
      PATCH: isRestorableUserAndRequestedUserSame,
    },
    taskStatusesIndex: {
      POST: isCurrentUserLoggedIn,
    },
    taskStatus: {
      PATCH: () => !isTryingModifyBuiltInStatus() && isCurrentUserLoggedIn(),
      DELETE: () => !isTryingModifyBuiltInStatus() && isCurrentUserLoggedIn(),
    },
    tasksMy: {
      GET: isCurrentUserLoggedIn,
    },
    tasksNew: {
      GET: isCurrentUserLoggedIn,
    },
    tasksIndex: {
      POST: isCurrentUserLoggedIn,
    },
    tasksProfile: {
      GET: canCurrentUserModifyTask,
      PATCH: canCurrentUserModifyTask,
      DELETE: canCurrentUserDeleteTask,
    },
  };

  const check = permissionCheckers[routeName][ctx.method];

  if (!check()) {
    ctx.throw(403);
  }

  await next();
};
