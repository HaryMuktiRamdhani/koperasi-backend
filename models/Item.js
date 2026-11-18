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
      validate: {
        isIn: [["Aktif", "Nonaktif", "Akan Datang"]],
      },
    },

    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "items",
    timestamps: true,
  },
);

module.exports = Item;