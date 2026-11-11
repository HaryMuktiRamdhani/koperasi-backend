const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

module.exports = sequelize.define(
  "UserSecuritySettings",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    sessionTimeoutMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      field: "session_timeout_minutes",
    },
  },
  { tableName: "user_security_settings", timestamps: true },
);
