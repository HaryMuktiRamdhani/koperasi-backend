module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("jurusan", "status", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "Aktif",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("jurusan", "status");
  },
};
