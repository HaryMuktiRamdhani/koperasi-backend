const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const Bill = sequelize.define(
  "Bill",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Belum Bayar",
    },
  },
  {
    tableName: "bills",
    timestamps: true,
  }
);

module.exports = Bill;