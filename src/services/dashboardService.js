const { fn, col, Op } = require("sequelize");
const { Student, Item, Bill, Payment } = require("../../models");

async function getDashboardStats() {
  const [
    totalStudents,
    totalItems,
    totalBills,
    paidBills,
    unpaidBills,
    income,
  ] = await Promise.all([
    // Hanya siswa aktif, sama dengan halaman Siswa.
    // Alumni (Lulus), Pindah, dan Keluar tidak ikut dihitung.
    Student.count({ where: { status: "Aktif" } }),

    // Hanya barang aktif. Barang Nonaktif dan "Akan Datang"
    // belum tersedia sehingga tidak ikut dihitung.
    Item.count({ where: { status: "Aktif" } }),

    Bill.count(),
    Bill.count({ where: { status: "Lunas" } }),
    Bill.count({ where: { status: { [Op.ne]: "Lunas" } } }),
    Payment.findOne({
      attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
      raw: true,
    }),
  ]);

  return {
    totalStudents,
    totalItems,
    totalBills,
    paidBills,
    unpaidBills,
    totalIncome: Number(income?.total || 0),
  };
}

module.exports = { getDashboardStats };