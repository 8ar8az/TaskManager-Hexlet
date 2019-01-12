import _ from 'lodash';
import getI18next from '../lib/i18next';

export default {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('TaskStatuses', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      isBuiltIn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    const i18next = await getI18next();

    const systemTaskStatuses = [
      i18next.t('common:systemTaskStatuses.new'),
      i18next.t('common:systemTaskStatuses.work'),
      i18next.t('common:systemTaskStatuses.test'),
      i18next.t('common:systemTaskStatuses.finish'),
    ];

    const systemTaskStatusesRows = _.map(
      systemTaskStatuses,
      name => ({
        name,
        isBuiltIn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    await queryInterface.bulkInsert('TaskStatuses', systemTaskStatusesRows);
  },
  down: queryInterface => queryInterface.dropTable('TaskStatuses'),
};
