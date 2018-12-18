import path from 'path';

export default {
  development: {
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '..', '..', '__tests__', '__fixtures__', 'db.sqlite'),
    define: {
      timestamps: true,
      freezeTableName: true,
    },
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    define: {
      timestamps: true,
      freezeTableName: true,
    },
  },
  production: {
    protocol: 'ssl',
    dialect: 'postgres',
    define: {
      timestamps: true,
      freezeTableName: true,
    },
  },
};
