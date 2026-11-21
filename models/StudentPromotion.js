const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const StudentPromotion = sequelize.define(
  "StudentPromotion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    batchId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    fromClassId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    toClassId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    fromClassName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    toClassName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    fromLevel: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    toLevel: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    fromAcademicYear: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    toAcademicYear: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    fromStatus: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    toStatus: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    // Salinan data saat proses, agar riwayat tetap utuh walau data berubah
    studentNis: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    studentName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    jurusanId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    jurusanName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    jurusanCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    processedByName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "student_promotions",
    timestamps: true,
  },
);

module.exports = StudentPromotion;