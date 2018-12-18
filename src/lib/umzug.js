import Umzug from 'umzug';
import path from 'path';

export default (sequelize) => {
  const umzugConfig = {
    storage: 'sequelize',
    storageOptions: {
      sequelize,
    },
    migrations: {
      params: [
        sequelize.getQueryInterface(),
        sequelize.constructor,
      ],
      path: path.resolve(__dirname, '..', 'migrations'),
      pattern: /\.js$/,
    },
  };

  const umzug = new Umzug(umzugConfig);

  return umzug;
};
