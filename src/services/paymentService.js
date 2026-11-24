
const { Op } = require("sequelize");
const sequelize = require("../config/database");

const Payment = require("../../models/Payment");
const Bill = require("../../models/Bill");
const User = require("../../models/User");
const { Student, Item, Class, Jurusan, GoodsIssue } = require("../../models");
const ServiceError = require("./ServiceError");

const NUMBER_LOCK_KEY = 20260302;

async function buildNextNumber(dateValue, transaction) {
  const prefix = `BK-${dateValue.replace(/-/g, "")}-`;

  const last = await GoodsIssue.findOne({
    where: {
      transactionNumber: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [
      [sequelize.fn("LENGTH", sequelize.col("transactionNumber")), "DESC"],
      ["transactionNumber", "DESC"],
    ],
    transaction,
  });

  const lastSequence = last
    ? Number(last.transactionNumber.slice(prefix.length))
    : 0;

  return `${prefix}${String(lastSequence + 1).padStart(4, "0")}`;
}

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
              {
                model: Jurusan,
                attributes: ["id", "nama", "kode"],
              },
            ],
          },
          {
            model: Item,
            attributes: ["id", "name", "price", "stock"],
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

async function createPayment({
  billId,
  amount,
  paymentMethod,
  paymentDate,
  notes,
  userId,
}) {
  if (!billId || amount === undefined || !paymentMethod || !paymentDate) {
    throw new ServiceError(400, "Data pembayaran belum lengkap");
  }

  if (
    typeof paymentDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) ||
    Number.isNaN(new Date(`${paymentDate}T00:00:00Z`).getTime()) ||
    new Date(`${paymentDate}T00:00:00Z`).toISOString().slice(0, 10) !==
      paymentDate
  ) {
    throw new ServiceError(400, "Tanggal pembayaran tidak valid");
  }

  if (typeof paymentMethod !== "string" || !paymentMethod.trim()) {
    throw new ServiceError(400, "Metode pembayaran tidak valid");
  }

  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    throw new ServiceError(400, "Catatan pembayaran tidak valid");
  }

  const paymentAmount = Number(amount);

  if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) {
    throw new ServiceError(400, "Nominal pembayaran tidak valid");
  }

  if (!userId) {
    throw new ServiceError(401, "Pengguna pembayaran tidak ditemukan");
  }

  const createdPayment = await sequelize.transaction(async (transaction) => {
    // Kunci nomor transaksi barang keluar agar tidak terjadi nomor duplikat.
    await sequelize.query("SELECT pg_advisory_xact_lock(:key)", {
      replacements: {
        key: NUMBER_LOCK_KEY,
      },
      transaction,
    });

    // Kunci tagihan agar pembayaran bersamaan tidak diproses dua kali.
    const bill = await Bill.findByPk(billId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!bill) {
      throw new ServiceError(404, "Tagihan tidak ditemukan");
    }

    if (bill.status === "Lunas") {
      throw new ServiceError(400, "Tagihan sudah lunas");
    }

    if (Number(bill.amount) !== paymentAmount) {
      throw new ServiceError(
        400,
        "Nominal pembayaran harus sesuai dengan nominal tagihan",
      );
    }

    const quantity = Number(bill.quantity || 1);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ServiceError(400, "Jumlah barang pada tagihan tidak valid");
    }

    // Ambil data siswa dan petugas untuk pencatatan barang keluar.
    const [student, user] = await Promise.all([
      Student.findByPk(bill.studentId, { transaction }),
      User.findByPk(userId, { transaction }),
    ]);

    if (!student) {
      throw new ServiceError(404, "Data siswa pada tagihan tidak ditemukan");
    }

    if (!user) {
      throw new ServiceError(404, "Data petugas tidak ditemukan");
    }

    // Kunci barang agar stok tidak berubah saat pembayaran diproses.
    const item = await Item.findByPk(bill.itemId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!item) {
      throw new ServiceError(404, "Barang pada tagihan tidak ditemukan");
    }

    const stockBefore = Number(item.stock);

    if (!Number.isInteger(stockBefore) || stockBefore < 0) {
      throw new ServiceError(400, "Data stok barang tidak valid");
    }

    if (quantity > stockBefore) {
      throw new ServiceError(
        400,
        `Stok tidak mencukupi. Stok tersedia ${stockBefore}, dibutuhkan ${quantity}.`,
      );
    }

    // Buat pembayaran.
    const payment = await Payment.create(
      {
        billId: bill.id,
        amount: paymentAmount,
        paymentMethod: paymentMethod.trim(),
        paymentDate,
        notes: typeof notes === "string" ? notes.trim() || null : null,
        userId,
      },
      { transaction },
    );

    // Catat barang keluar dengan alasan Penjualan.
    const goodsIssue = await GoodsIssue.create(
      {
        transactionNumber: await buildNextNumber(paymentDate, transaction),
        issueDate: paymentDate,
        recipientName: student.name,
        officerName: user.name,
        itemId: item.id,
        quantity,
        stockBefore,
        reason: "Penjualan",
        notes: `Penjualan melalui pembayaran tagihan ${bill.id}`,
        userId,
      },
      { transaction },
    );

    // Kurangi stok sesuai jumlah barang pada tagihan.
    await item.update(
      {
        stock: stockBefore - quantity,
      },
      { transaction },
    );

    // Ubah status tagihan menjadi lunas.
    await bill.update(
      {
        status: "Lunas",
      },
      { transaction },
    );

    return {
      payment,
      goodsIssue,
    };
  });

  return createdPayment.payment;
}

module.exports = {
  listPayments,
  createPayment,
};
