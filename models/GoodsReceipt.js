const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const GoodsReceipt = sequelize.define(
  "GoodsReceipt",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    transactionNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    receiptDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    supplierName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    senderName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    unitPrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    totalPrice: {
      type: DataTypes.INTEGER,
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
    tableName: "goods_receipts",
    timestamps: true,
  },
);

module.exports = GoodsReceipt;