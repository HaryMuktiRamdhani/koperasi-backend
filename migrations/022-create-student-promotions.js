module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("student_promotions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      batchId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      studentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      fromClassId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "classes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      toClassId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "classes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      // Salinan nama kelas agar riwayat tetap terbaca walau kelas dihapus
      fromClassName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      toClassName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fromLevel: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      toLevel: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fromAcademicYear: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      toAcademicYear: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fromStatus: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      toStatus: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Satu siswa hanya boleh diproses satu kali per tahun ajaran asal
    await queryInterface.addIndex(
      "student_promotions",
      ["studentId", "fromAcademicYear"],
      {
        unique: true,
        name: "student_promotions_student_year_unique",
      },
    );
    await queryInterface.addIndex("student_promotions", ["batchId"], {
      name: "student_promotions_batch_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("student_promotions");
  },
};