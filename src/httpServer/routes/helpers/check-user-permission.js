const canUserModifyUserData = (
  userWhoEdit,
  userWhoseDataEditing,
) => !!userWhoEdit && (userWhoEdit.id === userWhoseDataEditing.id);

const canUserCreateAndModifyTaskStatus = user => !!user;

const canUserCreateAndHaveHimselfTasks = user => !!user;

const canUserModifyTask = (user, task) => {
  const { creator, assignedTo } = task;
  return !!user && (user.equals(creator) || user.equals(assignedTo));
};

const canUserDeleteTask = (user, task) => {
  const { creator } = task;
  return !!user && user.equals(creator);
};

export default {
  canUserModifyUserData,
  canUserCreateAndModifyTaskStatus,
  canUserCreateAndHaveHimselfTasks,
  canUserModifyTask,
  canUserDeleteTask,
};
