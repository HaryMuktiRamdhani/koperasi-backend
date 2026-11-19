const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Item, User, GoodsIssue } = require("../../models");
const ServiceError = require("../services/ServiceError");

const MAX_INT = 2147483647;
const MAX_TEXT_LENGTH = 150;
const MAX_NOTES_LENGTH = 500;
const REASONS = ["Penjualan", "Penggunaan", "Peminjaman", "Lainnya"];
// Kunci advisory lock agar pembuatan nomor transaksi tidak balapan.
const NUMBER_LOCK_KEY = 20260302;

function parseQuantity(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > MAX_INT) return null;
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

// Format: BK-YYYYMMDD-0001 (urutan naik per tanggal barang keluar)
async function buildNextNumber(dateValue, transaction) {
  const prefix = `BK-${dateValue.replace(/-/g, "")}-`;
  const last = await GoodsIssue.findOne({
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
    const data = await GoodsIssue.findAll({
      include: includeRelations,
      order: [
        ["issueDate", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data barang keluar",
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
      issueDate,
      recipientName,
      officerName,
      itemId,
      quantity,
      reason,
      notes,
    } = req.body;

    const dateValue = parseDate(issueDate);
    if (dateValue === null) {
      return res.status(400).json({ message: "Tanggal barang keluar tidak valid" });
    }

    const recipientError = validateText(recipientName, "Nama penerima");
    if (recipientError) {
      return res.status(400).json({ message: recipientError });
    }

    const officerError = validateText(officerName, "Nama petugas");
    if (officerError) return res.status(400).json({ message: officerError });

    if (!itemId || typeof itemId !== "string") {
      return res.status(400).json({ message: "Barang wajib dipilih" });
    }

    const quantityNumber = parseQuantity(quantity);
    if (quantityNumber === null) {
      return res.status(400).json({
        message: "Jumlah barang keluar harus berupa angka bulat 1 atau lebih.",
      });
    }

    if (!REASONS.includes(reason)) {
      return res.status(400).json({ message: "Alasan barang keluar tidak valid" });
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

      // Baris barang dikunci agar pengecekan stok tidak balapan
      const item = await Item.findByPk(itemId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!item) throw new ServiceError(404, "Barang tidak ditemukan");

      if (quantityNumber > item.stock) {
        throw new ServiceError(
          400,
          `Stok tidak mencukupi. Stok tersedia ${item.stock}, diminta ${quantityNumber}.`,
        );
      }

      const record = await GoodsIssue.create(
        {
          transactionNumber: await buildNextNumber(dateValue, transaction),
          issueDate: dateValue,
          recipientName: recipientName.trim(),
          officerName: officerName.trim(),
          itemId: item.id,
          quantity: quantityNumber,
          stockBefore: item.stock,
          reason,
          notes: cleanNotes || null,
          userId: req.user.id,
        },
        { transaction },
      );

      await item.update({ stock: item.stock - quantityNumber }, { transaction });

      return record;
    });

    const data = await GoodsIssue.findByPk(created.id, {
      include: includeRelations,
    });

    res.status(201).json({
      message: "Barang keluar berhasil disimpan",
      data,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);

    res.status(500).json({
      message: "Gagal menyimpan barang keluar",
    });
  }
}

module.exports = {
  getAll,
  getNextNumber,
  create,
};