const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const Student = sequelize.define(
  "Student",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    nis: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    classId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    jurusanId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    generation: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Aktif",
    },
  },
  {
    tableName: "students",
    timestamps: true,
  }
);

module.exports = Student;