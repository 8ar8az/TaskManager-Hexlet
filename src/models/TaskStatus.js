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
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    getterMethods: {
      isBuiltIn() {
        return _.includes(systemTaskStatuses, this.getDataValue('name'));
      },
    },
    scopes: {
      deleted: {
        where: {
          isActive: {
            [sequelize.constructor.Op.eq]: false,
          },
        },
      },
      active: {
        where: {
          isActive: {
            [sequelize.constructor.Op.eq]: true,
          },
        },
      },
    },
  });

  TaskStatus.prototype.delete = function del() {
    this.isActive = false;
  };

  TaskStatus.prototype.restore = function restore() {
    this.isActive = true;
  };


  TaskStatus.associate = (models) => {
    TaskStatus.hasMany(models.Task, { as: 'tasks', foreignKey: 'statusId' });
  };

  return TaskStatus;
};
