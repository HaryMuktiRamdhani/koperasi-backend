module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("classes", "jurusanId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "jurusan",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("classes", "jurusanId");
  },
};
