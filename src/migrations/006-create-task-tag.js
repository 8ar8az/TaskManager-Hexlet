export default {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('TaskTags', {
      TaskId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      TagId: {
        type: DataTypes.INTEGER,
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

    await queryInterface.addConstraint('TaskTags', ['TaskId'], {
      type: 'foreign key',
      references: {
        table: 'Tasks',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });

    await queryInterface.addConstraint('TaskTags', ['TagId'], {
      type: 'foreign key',
      references: {
        table: 'Tags',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });

    await queryInterface.addConstraint('TaskTags', ['TagId', 'TaskId'], {
      type: 'primary key',
    });
  },
  down: queryInterface => queryInterface.dropTable('TaskTags'),
};
