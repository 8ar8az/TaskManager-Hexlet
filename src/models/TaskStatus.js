export default i18next => (sequelize, DataTypes) => {
  const TaskStatus = sequelize.define('TaskStatus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: i18next.t('validation:TaskStatus.name.notEmpty'),
        },
      },
    },
    isBuiltIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });

  TaskStatus.associate = (models) => {
    TaskStatus.hasMany(models.Task, { as: 'tasks', foreignKey: 'statusId' });
  };

  return TaskStatus;
};
