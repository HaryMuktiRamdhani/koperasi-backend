const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

module.exports = sequelize.define("RecoveryCode", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
  codeHash: { type: DataTypes.STRING(128), allowNull: false, field: "code_hash" },
  usedAt: { type: DataTypes.DATE, allowNull: true, field: "used_at" },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
}, { tableName: "recovery_codes", timestamps: false, updatedAt: false });
