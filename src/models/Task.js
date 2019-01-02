export default (sequelize, DataTypes) => {
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
          msg: 'Название задачи не может быть пустым',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    validate: {
      statusId() {
        if (!this.statusId) {
          throw new Error('Должен быть указан статус задачи');
        }
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

  Task.prototype.delete = function del() {
    this.isActive = false;
  };

  Task.prototype.restore = function restore() {
    this.isActive = true;
  };


  Task.associate = (models) => {
    Task.belongsTo(models.TaskStatus, { as: 'status' });
    Task.belongsTo(models.User, { as: 'creator' });
    Task.belongsTo(models.User, { as: 'assignedTo' });
    Task.belongsToMany(models.Tag, { through: 'TaskTags' });
  };

  return Task;
};
