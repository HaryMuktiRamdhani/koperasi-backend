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
