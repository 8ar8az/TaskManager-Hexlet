export default (sequelize, DataTypes) => sequelize.define('Session', {
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
});
