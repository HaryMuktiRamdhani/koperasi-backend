module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("items", "imageUrl", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("items", "imageUrl");
  },
};