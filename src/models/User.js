import encrypt from '../lib/secure';

export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    firstname: {
      type: DataTypes.STRING,
    },
    lastname: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Необходимо указать email в формате example@example.com',
        },
        notEmpty: {
          msg: 'Email должен быть указан',
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.VIRTUAL,
      set(pass) {
        this.setDataValue('password', pass);
        this.setDataValue('passwordHash', encrypt(pass));
      },
      validate: {
        is: {
          args: /[\S]{6,}/,
          msg: 'Пароль должен состоять не менее чем из 6 символов и не содержать пробелов',
        },
      },
    },
  }, {
    getterMethods: {
      fullName() {
        return `${this.getDataValue('firstname')} ${this.getDataValue('lastname')}`;
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

  User.prototype.delete = function del() {
    this.isActive = false;
  };

  User.prototype.restore = function restore() {
    this.isActive = true;
  };

  User.associate = (models) => {
    User.hasMany(models.Task, { as: 'createdTasks', foreignKey: 'creatorId' });
    User.hasMany(models.Task, { as: 'assignedTasks', foreignKey: 'assignedToId' });
  };

  return User;
};
