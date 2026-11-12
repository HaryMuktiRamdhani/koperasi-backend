const Payment = require("../../models/Payment");
const Bill = require("../../models/Bill");
const User = require("../../models/User");
const { Student, Item, Class, Jurusan } = require("../../models");
const ServiceError = require("./ServiceError");

async function listPayments() {
  return Payment.findAll({
    include: [
      {
        model: Bill,
        include: [
          {
            model: Student,
            attributes: ["id", "nis", "name", "classId", "jurusanId"],
            include: [
              {
                model: Class,
                attributes: ["id", "name", "level", "academicYear"],
              },
              { model: Jurusan, attributes: ["id", "nama", "kode"] },
            ],
          },
          {
            model: Item,
            attributes: ["id", "name", "price"],
          },
        ],
      },
      {
        model: User,
        attributes: ["id", "name", "email"],
      },
    ],
    order: [["paymentDate", "DESC"]],
  });
}

async function createPayment({ billId, amount, paymentMethod, paymentDate, notes, userId }) {
  if (!billId || amount === undefined || !paymentMethod || !paymentDate) {
    throw new ServiceError(400, "Data pembayaran belum lengkap");
  }

  const bill = await Bill.findByPk(billId);
  if (!bill) throw new ServiceError(404, "Tagihan tidak ditemukan");
  if (bill.status === "Lunas") {
    throw new ServiceError(400, "Tagihan sudah lunas");
  }
  if (amount !== bill.amount) {
    throw new ServiceError(
      400,
      "Nominal pembayaran harus sesuai dengan nominal tagihan",
    );
  }

  const payment = await Payment.create({
    billId,
    amount,
    paymentMethod,
    paymentDate,
    notes: notes || null,
    userId,
  });

  await bill.update({ status: "Lunas" });
  return payment;
}

module.exports = { listPayments, createPayment };
