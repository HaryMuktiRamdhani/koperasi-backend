const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");

const Item = sequelize.define(
  "Item",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Aktif",
    },
  },
  {
    tableName: "items",
    timestamps: true,
  }
);

module.exports = Item;