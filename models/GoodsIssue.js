const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const GoodsIssue = sequelize.define(
  "GoodsIssue",
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

    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    recipientName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    officerName: {
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

    stockBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    reason: {
      type: DataTypes.STRING,
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
    tableName: "goods_issues",
    timestamps: true,
  },
);

module.exports = GoodsIssue;