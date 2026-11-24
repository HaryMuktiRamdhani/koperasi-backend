
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

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        isInt: true,
      },
    },

    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    billDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
  },
);

module.exports = Bill;
