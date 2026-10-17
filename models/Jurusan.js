const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const Jurusan = sequelize.define(
  "Jurusan",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    nama: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    kode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Aktif",
      validate: {
        isIn: [["Aktif", "Nonaktif", "Akan Datang"]],
      },
    },
  },
  {
    tableName: "jurusan",
    timestamps: true,
  }
);

module.exports = Jurusan;