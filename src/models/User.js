import StateMachine from 'javascript-state-machine';
import _ from 'lodash';
import encrypt from '../lib/secure';

const mixinStateMachine = (user) => {
  if (!user) {
    return;
  }

  if (_.isArray(user)) {
    _.forEach(user, mixinStateMachine);
    return;
  }

  StateMachine.apply(user, {
    init: user.status,
    transitions: [
      { name: 'delete', from: 'active', to: 'deleted' },
      { name: 'restore', from: 'deleted', to: 'active' },
    ],
    methods: {
      onEnterState(lifestyle) {
        this.status = lifestyle.to;
      },
    },
  });
};

export default (sequelize, DataTypes) => sequelize.define('Users', {
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
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'deleted']],
    },
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
    isActive() {
      return (this.getDataValue('status') === 'active');
    },
  },
  hooks: {
    afterCreate: mixinStateMachine,
    afterFind: mixinStateMachine,
  },
  scopes: {
    deleted: {
      where: {
        status: {
          [sequelize.constructor.Op.eq]: 'deleted',
        },
      },
    },
    active: {
      where: {
        status: {
          [sequelize.constructor.Op.eq]: 'active',
        },
      },
    },
  },
});
