const { Op } = require("sequelize");
const { Bill, Payment, Student, Item } = require("../../models");

async function getNotifications(req, res) {
  try {
    const [unpaidBills, recentPayments] = await Promise.all([
      Bill.findAll({
        where: { status: { [Op.ne]: "Lunas" } },
        include: [{ model: Student, attributes: ["name"] }, { model: Item, attributes: ["name"] }],
        order: [["createdAt", "DESC"]],
        limit: 10,
      }),
      Payment.findAll({
        include: [{ model: Bill, include: [{ model: Student, attributes: ["name"] }] }],
        order: [["createdAt", "DESC"]],
        limit: 10,
      }),
    ]);

    return res.json({
      readTrackingSupported: false,
      unreadCount: 0,
      items: [
        ...unpaidBills.map((bill) => ({
          id: `bill-${bill.id}`,
          type: "unpaid-bill",
          title: "Tagihan belum lunas",
          message: `${bill.Student?.name || "Siswa"} · ${bill.Item?.name || "Barang"}`,
          detail: `Rp ${Number(bill.amount).toLocaleString("id-ID")}`,
          path: "/bills",
          createdAt: bill.createdAt,
        })),
        ...recentPayments.map((payment) => ({
          id: `payment-${payment.id}`,
          type: "payment",
          title: "Pembayaran tercatat",
          message: payment.Bill?.Student?.name || "Pembayaran siswa",
          detail: `Rp ${Number(payment.amount).toLocaleString("id-ID")}`,
          path: "/payments",
          createdAt: payment.createdAt,
        })),
      ],
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return res.status(500).json({ message: "Gagal mengambil notifikasi" });
  }
}

module.exports = { getNotifications };
