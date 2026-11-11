const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const CooperativeProfile = sequelize.define(
  "CooperativeProfile",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: "Koperasi Sekolah",
    },
    subtitle: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: "KOPERASI SEKOLAH",
    },
    logoUrl: { type: DataTypes.STRING(500), allowNull: true },
  },
  { tableName: "cooperative_profiles", timestamps: true },
);

module.exports = CooperativeProfile;
