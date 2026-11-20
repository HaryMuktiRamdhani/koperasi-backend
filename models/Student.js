const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const GENDERS = ["Laki-laki", "Perempuan"];

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

    // Boleh kosong agar siswa lama tidak error; siswa baru wajib mengisinya
    // (divalidasi di controller).
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [GENDERS],
      },
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
  },
);

Student.GENDERS = GENDERS;

module.exports = Student;