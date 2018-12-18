export default {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('Users', {
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
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
      },
      passwordHash: {
        type: DataTypes.STRING,
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

    await queryInterface.addConstraint('Users', ['status'], {
      type: 'check',
      where: {
        status: {
          [DataTypes.Op.in]: ['active', 'deleted'],
        },
      },
    });
  },
  down: queryInterface => queryInterface.dropTable('Users'),
};
