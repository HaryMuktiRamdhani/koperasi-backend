const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const Class = sequelize.define(
  "Class",
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

    level: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    academicYear: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    jurusanId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Aktif",
    },
  },
  {
    tableName: "classes",
    timestamps: true,
  }
);

module.exports = Class;