import _ from 'lodash';

export const systemTaskStatuses = ['Новая', 'В работе', 'На тестировании', 'Завершена'];

export default (sequelize, DataTypes) => {
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
          msg: 'Название статуса задачи не может быть пустым',
        },
      },
    },
  }, {
    getterMethods: {
      isBuiltIn() {
        return _.includes(systemTaskStatuses, this.getDataValue('name'));
      },
    },
  });

  TaskStatus.associate = (models) => {
    TaskStatus.hasMany(models.Task, { as: 'tasks', foreignKey: 'statusId' });
  };

  return TaskStatus;
};
