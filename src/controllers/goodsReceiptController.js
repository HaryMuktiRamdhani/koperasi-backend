const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Item, User, GoodsReceipt } = require("../../models");
const ServiceError = require("../services/ServiceError");

const MAX_INT = 2147483647;
const MAX_TEXT_LENGTH = 150;
const MAX_NOTES_LENGTH = 500;
// Kunci advisory lock agar pembuatan nomor transaksi tidak balapan.
const NUMBER_LOCK_KEY = 20260301;

function parseInteger(value, { min }) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > MAX_INT) {
    return null;
  }
  return number;
}

function parseDate(value) {
  if (value === undefined || value === null || value === "") {
    return new Date().toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

function validateText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    return `${label} wajib diisi.`;
  }
  if (value.trim().length > MAX_TEXT_LENGTH) {
    return `${label} maksimal ${MAX_TEXT_LENGTH} karakter.`;
  }
  return null;
}

// Format: BM-YYYYMMDD-0001 (urutan naik per tanggal barang masuk)
async function buildNextNumber(dateValue, transaction) {
  const prefix = `BM-${dateValue.replace(/-/g, "")}-`;
  const last = await GoodsReceipt.findOne({
    where: { transactionNumber: { [Op.like]: `${prefix}%` } },
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

const includeRelations = [
  { model: Item, attributes: ["id", "name", "imageUrl", "stock"] },
  { model: User, attributes: ["id", "name"] },
];

async function getAll(req, res) {
  try {
    const data = await GoodsReceipt.findAll({
      include: includeRelations,
      order: [
        ["receiptDate", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data barang masuk",
    });
  }
}

async function getNextNumber(req, res) {
  try {
    const dateValue = parseDate(req.query.date);
    if (dateValue === null) {
      return res.status(400).json({ message: "Tanggal tidak valid" });
    }

    res.json({ transactionNumber: await buildNextNumber(dateValue) });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal membuat nomor transaksi",
    });
  }
}

async function create(req, res) {
  try {
    const {
      receiptDate,
      supplierName,
      senderName,
      itemId,
      quantity,
      unitPrice,
      notes,
    } = req.body;

    const dateValue = parseDate(receiptDate);
    if (dateValue === null) {
      return res.status(400).json({ message: "Tanggal barang masuk tidak valid" });
    }

    const supplierError = validateText(supplierName, "Nama supplier");
    if (supplierError) return res.status(400).json({ message: supplierError });

    const senderError = validateText(senderName, "Nama pengirim");
    if (senderError) return res.status(400).json({ message: senderError });

    if (!itemId || typeof itemId !== "string") {
      return res.status(400).json({ message: "Barang wajib dipilih" });
    }

    const quantityNumber = parseInteger(quantity, { min: 1 });
    if (quantityNumber === null) {
      return res.status(400).json({
        message: "Jumlah barang masuk harus berupa angka bulat 1 atau lebih.",
      });
    }

    const unitPriceNumber = parseInteger(unitPrice, { min: 0 });
    if (unitPriceNumber === null) {
      return res.status(400).json({
        message: "Harga beli harus berupa angka bulat 0 atau lebih.",
      });
    }

    const totalPrice = quantityNumber * unitPriceNumber;
    if (totalPrice > MAX_INT) {
      return res.status(400).json({
        message: "Total harga terlalu besar. Periksa jumlah dan harga beli.",
      });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return res.status(400).json({ message: "Catatan tidak valid" });
    }
    const cleanNotes = typeof notes === "string" ? notes.trim() : "";
    if (cleanNotes.length > MAX_NOTES_LENGTH) {
      return res.status(400).json({
        message: `Catatan maksimal ${MAX_NOTES_LENGTH} karakter.`,
      });
    }

    const created = await sequelize.transaction(async (transaction) => {
      // Satu antrean untuk pembuatan nomor transaksi (dilepas saat commit)
      await sequelize.query("SELECT pg_advisory_xact_lock(:key)", {
        replacements: { key: NUMBER_LOCK_KEY },
        transaction,
      });

      const item = await Item.findByPk(itemId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!item) throw new ServiceError(404, "Barang tidak ditemukan");

      const nextStock = item.stock + quantityNumber;
      if (nextStock > MAX_INT) {
        throw new ServiceError(
          400,
          "Jumlah barang masuk membuat stok melebihi batas maksimum.",
        );
      }

      const record = await GoodsReceipt.create(
        {
          transactionNumber: await buildNextNumber(dateValue, transaction),
          receiptDate: dateValue,
          supplierName: supplierName.trim(),
          senderName: senderName.trim(),
          itemId: item.id,
          quantity: quantityNumber,
          unitPrice: unitPriceNumber,
          totalPrice,
          notes: cleanNotes || null,
          userId: req.user.id,
        },
        { transaction },
      );

      await item.update({ stock: nextStock }, { transaction });

      return record;
    });

    const data = await GoodsReceipt.findByPk(created.id, {
      include: includeRelations,
    });

    res.status(201).json({
      message: "Barang masuk berhasil disimpan",
      data,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);

    res.status(500).json({
      message: "Gagal menyimpan barang masuk",
    });
  }
}

module.exports = {
  getAll,
  getNextNumber,
  create,
};