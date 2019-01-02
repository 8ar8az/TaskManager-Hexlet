import _ from 'lodash';
import { systemTaskStatuses } from '../models/TaskStatus';

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
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    const systemTaskStatusesRows = _.map(
      systemTaskStatuses,
      name => ({ name, createdAt: new Date(), updatedAt: new Date() }),
    );

    await queryInterface.bulkInsert('TaskStatuses', systemTaskStatusesRows);
  },
  down: queryInterface => queryInterface.dropTable('TaskStatuses'),
};
