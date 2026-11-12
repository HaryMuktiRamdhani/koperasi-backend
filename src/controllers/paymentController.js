const {
  listPayments,
  createPayment,
} = require("../services/paymentService");
const ServiceError = require("../services/ServiceError");

async function getAll(req, res) {
  try {
    return res.json(await listPayments());
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Gagal mengambil data pembayaran",
    });
  }
}

async function create(req, res) {
  try {
    const payment = await createPayment({
      ...req.body,
      userId: req.user.id,
    });
    return res.status(201).json({
      message: "Pembayaran berhasil",
      data: payment,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({
      message: "Gagal memproses pembayaran",
    });
  }
}

module.exports = {
  getAll,
  create,
};
