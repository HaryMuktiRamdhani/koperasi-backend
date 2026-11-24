
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("bills", "quantity", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("bills", "quantity");
  },
};
