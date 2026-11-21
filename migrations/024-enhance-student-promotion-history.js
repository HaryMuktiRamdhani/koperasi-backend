module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Kolom salinan data saat proses (nullable agar baris lama tidak error)
      await queryInterface.addColumn(
        "student_promotions",
        "studentNis",
        { type: Sequelize.STRING, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "student_promotions",
        "studentName",
        { type: Sequelize.STRING, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "student_promotions",
        "jurusanId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "jurusan", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "student_promotions",
        "jurusanName",
        { type: Sequelize.STRING, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "student_promotions",
        "jurusanCode",
        { type: Sequelize.STRING, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "student_promotions",
        "processedByName",
        { type: Sequelize.STRING, allowNull: true },
        { transaction },
      );

      // 2. Lengkapi baris riwayat yang sudah ada dari data terkini.
      //    Hanya mengisi kolom baru; kolom lama tidak disentuh.
      await queryInterface.sequelize.query(
        `UPDATE "student_promotions" AS sp
            SET "studentNis" = s."nis",
                "studentName" = s."name",
                "jurusanId" = s."jurusanId",
                "jurusanName" = j."nama",
                "jurusanCode" = j."kode"
           FROM "students" AS s
           LEFT JOIN "jurusan" AS j ON j."id" = s."jurusanId"
          WHERE sp."studentId" = s."id"`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `UPDATE "student_promotions" AS sp
            SET "processedByName" = u."name"
           FROM "users" AS u
          WHERE sp."userId" = u."id"`,
        { transaction },
      );

      // 3. Keputusan "Tidak Diproses" ikut dicatat sebagai riwayat, tetapi tidak
      //    boleh mengunci siswa. Unique index hanya berlaku untuk keputusan
      //    yang benar-benar memproses siswa.
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "student_promotions_student_year_unique"',
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX "student_promotions_student_year_unique"
           ON "student_promotions" ("studentId", "fromAcademicYear")
        WHERE "action" <> 'Tidak Diproses'`,
        { transaction },
      );

      // 4. Index untuk filter tahun ajaran & urutan tanggal pada halaman riwayat
      await queryInterface.addIndex(
        "student_promotions",
        ["fromAcademicYear", "createdAt"],
        { name: "student_promotions_year_created_idx", transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "student_promotions",
        "student_promotions_year_created_idx",
        { transaction },
      );

      // Baris "Tidak Diproses" hanya ada karena migrasi ini, dan harus dihapus
      // agar unique index awal (tanpa pengecualian) bisa dipulihkan.
      await queryInterface.sequelize.query(
        `DELETE FROM "student_promotions" WHERE "action" = 'Tidak Diproses'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "student_promotions_student_year_unique"',
        { transaction },
      );
      await queryInterface.addIndex(
        "student_promotions",
        ["studentId", "fromAcademicYear"],
        {
          unique: true,
          name: "student_promotions_student_year_unique",
          transaction,
        },
      );

      for (const column of [
        "processedByName",
        "jurusanCode",
        "jurusanName",
        "jurusanId",
        "studentName",
        "studentNis",
      ]) {
        await queryInterface.removeColumn("student_promotions", column, {
          transaction,
        });
      }
    });
  },
};