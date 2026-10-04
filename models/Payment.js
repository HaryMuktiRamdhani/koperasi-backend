const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    billId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    tableName: "payments",
    timestamps: true,
  }
);

module.exports = Payment;