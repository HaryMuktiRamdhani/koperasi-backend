const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const StockOpname = sequelize.define(
  "StockOpname",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    systemStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    physicalStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    difference: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    opnameDate: {
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
    tableName: "stock_opnames",
    timestamps: true,
  },
);

module.exports = StockOpname;