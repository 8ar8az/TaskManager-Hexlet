export default {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('Tasks', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      statusId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      creatorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      assignedToId: {
        type: DataTypes.INTEGER,
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

    await queryInterface.addConstraint('Tasks', ['statusId'], {
      type: 'foreign key',
      references: {
        table: 'TaskStatuses',
        field: 'id',
      },
      onDelete: 'restrict',
      onUpdate: 'restrict',
    });

    await queryInterface.addConstraint('Tasks', ['creatorId'], {
      type: 'foreign key',
      references: {
        table: 'Users',
        field: 'id',
      },
      onDelete: 'restrict',
      onUpdate: 'restrict',
    });

    await queryInterface.addConstraint('Tasks', ['assignedToId'], {
      type: 'foreign key',
      references: {
        table: 'Users',
        field: 'id',
      },
      onDelete: 'restrict',
      onUpdate: 'restrict',
    });
  },
  down: queryInterface => queryInterface.dropTable('Tasks'),
};
