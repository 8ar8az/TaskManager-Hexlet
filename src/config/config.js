import path from 'path';

export default {
  development: {
    database_url: `sqlite://${path.resolve(__dirname, '..', '..', '__tests__', '__fixtures__', 'db.sqlite')}`,
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '..', '..', '__tests__', '__fixtures__', 'db.sqlite'),
    define: {
      timestamps: true,
    },
  },
  test: {
    database_url: 'sqlite://:memory:',
    dialect: 'sqlite',
    storage: ':memory:',
    define: {
      timestamps: true,
    },
    logging: false,
  },
  production: {
    database_url: process.env.DATABASE_URL,
    protocol: 'ssl',
    dialect: 'postgres',
    define: {
      timestamps: true,
    },
  },
};
