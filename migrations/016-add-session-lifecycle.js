module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sessions", "status", {
      type: Sequelize.ENUM("active", "revoked", "expired"),
      allowNull: false,
      defaultValue: "active",
    });
    await queryInterface.addColumn("sessions", "endedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("sessions", "deviceName", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("sessions", "browser", {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn("sessions", "operatingSystem", {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn("login_histories", "session_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "sessions", key: "id" },
      onDelete: "SET NULL",
    });
  },
  async down() {
    throw new Error(
      "Destructive rollback is disabled for session lifecycle migration",
    );
  },
};
