module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "isActive", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "isActive");
  },
};
