module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("goods_issues", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      transactionNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      issueDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      recipientName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      officerName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      itemId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      stockBefore: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("goods_issues");
  },
};