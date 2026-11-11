const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

module.exports = sequelize.define(
  "SystemSecuritySettings",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    maxFailedAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      field: "max_failed_attempts",
    },
    lockoutMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      field: "lockout_minutes",
    },
    pwMinLength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8,
      field: "pw_min_length",
    },
    pwRequireLetterNumber: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "pw_require_letter_number",
    },
    pwRequireSpecial: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "pw_require_special",
    },
  },
  { tableName: "system_security_settings", timestamps: true },
);
