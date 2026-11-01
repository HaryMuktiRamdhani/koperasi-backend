const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const Session = sequelize.define("Session", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  jti: { type: DataTypes.UUID, allowNull: false, unique: true },
  userAgent: { type: DataTypes.STRING(500), allowNull: true },
  ipAddress: { type: DataTypes.STRING(100), allowNull: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "sessions", timestamps: true });

module.exports = Session;
