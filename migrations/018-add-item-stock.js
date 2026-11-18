module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("items", "stock", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("items", "stock");
  },
};