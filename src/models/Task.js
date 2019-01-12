export default i18next => (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: i18next.t('validation:Task.name.notEmpty'),
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
  }, {
    validate: {
      statusId() {
        if (!this.statusId) {
          throw new Error(i18next.t('validation:Task.statusId.notEmpty'));
        }
      },
    },
  });

  Task.associate = (models) => {
    Task.belongsTo(models.TaskStatus, { as: 'status' });
    Task.belongsTo(models.User, { as: 'creator' });
    Task.belongsTo(models.User, { as: 'assignedTo' });
    Task.belongsToMany(models.Tag, { through: 'TaskTags' });
  };

  return Task;
};
