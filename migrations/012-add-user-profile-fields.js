module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "username", { type: Sequelize.STRING(50), allowNull: true, unique: true });
    await queryInterface.addColumn("users", "phone", { type: Sequelize.STRING(30), allowNull: true });
    await queryInterface.addColumn("users", "bio", { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn("users", "avatarUrl", { type: Sequelize.TEXT, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("users", "avatarUrl");
    await queryInterface.removeColumn("users", "bio");
    await queryInterface.removeColumn("users", "phone");
    await queryInterface.removeColumn("users", "username");
  },
};
