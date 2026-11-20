module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Nullable dan tanpa default: siswa yang sudah ada tidak diubah sama
      // sekali, jenis kelaminnya tetap kosong sampai admin melengkapinya.
      await queryInterface.addColumn(
        "students",
        "gender",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction },
      );

      // Penjaga di level database: kosong (NULL) boleh, selain itu hanya
      // Laki-laki atau Perempuan.
      await queryInterface.sequelize.query(
        `ALTER TABLE "students"
           ADD CONSTRAINT "students_gender_valid"
           CHECK ("gender" IS NULL OR "gender" IN ('Laki-laki', 'Perempuan'))`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_gender_valid"',
        { transaction },
      );
      await queryInterface.removeColumn("students", "gender", { transaction });
    });
  },
};