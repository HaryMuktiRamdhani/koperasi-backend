const Payment = require("../../models/Payment");
const Bill = require("../../models/Bill");
const User = require("../../models/User");

async function getAll(req, res) {
  try {
    const data = await Payment.findAll({
      include: [
        {
          model: Bill,
        },
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["paymentDate", "DESC"]],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data pembayaran",
    });
  }
}

async function create(req, res) {
  try {
    const {
      billId,
      amount,
      paymentMethod,
      paymentDate,
      notes,
    } = req.body;

    if (
      !billId ||
      amount === undefined ||
      !paymentMethod ||
      !paymentDate
    ) {
      return res.status(400).json({
        message: "Data pembayaran belum lengkap",
      });
    }

    const bill = await Bill.findByPk(billId);

    if (!bill) {
      return res.status(404).json({
        message: "Tagihan tidak ditemukan",
      });
    }

    if (bill.status === "Lunas") {
      return res.status(400).json({
        message: "Tagihan sudah lunas",
      });
    }

    if (amount !== bill.amount) {
      return res.status(400).json({
        message: "Nominal pembayaran harus sesuai dengan nominal tagihan",
      });
    }

    const payment = await Payment.create({
      billId,
      amount,
      paymentMethod,
      paymentDate,
      notes: notes || null,
      userId: req.user.id,
    });

    await bill.update({
      status: "Lunas",
    });

    res.status(201).json({
      message: "Pembayaran berhasil",
      data: payment,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal memproses pembayaran",
    });
  }
}

module.exports = {
  getAll,
  create,
};