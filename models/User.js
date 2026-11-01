const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "admin",
      validate: {
        isIn: [["admin", "staff"]],
      },
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    username: { type: DataTypes.STRING(50), allowNull: true, unique: true },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    avatarUrl: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

module.exports = User;