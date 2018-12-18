export default {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('Sessions', {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      sessionData: {
        type: DataTypes.STRING,
      },
      expirationDate: {
        type: DataTypes.DATE,
        allowNull: false,
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
  },
  down: queryInterface => queryInterface.dropTable('Sessions'),
};
