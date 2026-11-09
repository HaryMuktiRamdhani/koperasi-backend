const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

module.exports = sequelize.define("LoginHistory", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true, field: "user_id" },
  identifierAttempted: { type: DataTypes.STRING(255), allowNull: false, field: "identifier_attempted" },
  ip: { type: DataTypes.STRING(100), allowNull: true },
  userAgent: { type: DataTypes.STRING(500), allowNull: true, field: "user_agent" },
  deviceLabel: { type: DataTypes.STRING(150), allowNull: true, field: "device_label" },
  sessionId: { type: DataTypes.UUID, allowNull: true, field: "session_id" },
  status: { type: DataTypes.ENUM("success", "failed", "locked", "2fa_failed"), allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
}, { tableName: "login_histories", timestamps: false, updatedAt: false });
