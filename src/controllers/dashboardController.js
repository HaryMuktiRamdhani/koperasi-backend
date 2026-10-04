const { fn, col, Op } = require("sequelize");
const { Student, Item, Bill, Payment } = require("../../models");

async function getDashboard(req, res) {
  try {
    const [totalStudents, totalItems, totalBills, paidBills, unpaidBills, income] =
      await Promise.all([
        Student.count(),
        Item.count(),
        Bill.count(),
        Bill.count({ where: { status: "Lunas" } }),
        Bill.count({ where: { status: { [Op.ne]: "Lunas" } } }),
        Payment.findOne({
          attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
          raw: true,
        }),
      ]);

    return res.json({
      totalStudents,
      totalItems,
      totalBills,
      paidBills,
      unpaidBills,
      totalIncome: Number(income.total),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({
      message: "Gagal mengambil data dashboard",
    });
  }
}

module.exports = {
  getDashboard,
};
