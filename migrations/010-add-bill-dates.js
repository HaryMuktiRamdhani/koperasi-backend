module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("bills", "billDate", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn("bills", "dueDate", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("bills", "dueDate");
    await queryInterface.removeColumn("bills", "billDate");
  },
};
