const sequelize = require("../config/database");
const { Item, User, StockOpname } = require("../../models");
const ServiceError = require("../services/ServiceError");

const MAX_STOCK = 2000000000;
const MAX_NOTES_LENGTH = 500;

function parseStock(stock) {
  if (typeof stock !== "number" && typeof stock !== "string") return null;
  if (typeof stock === "string" && stock.trim() === "") return null;
  const value = Number(stock);
  if (!Number.isInteger(value) || value < 0 || value > MAX_STOCK) return null;
  return value;
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

const includeRelations = [
  { model: Item, attributes: ["id", "name", "imageUrl"] },
  { model: User, attributes: ["id", "name"] },
];

async function getAll(req, res) {
  try {
    const data = await StockOpname.findAll({
      include: includeRelations,
      order: [
        ["opnameDate", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data opname",
    });
  }
}

async function create(req, res) {
  try {
    const { itemId, physicalStock, opnameDate, notes } = req.body;

    if (!itemId || typeof itemId !== "string") {
      return res.status(400).json({ message: "Barang wajib dipilih" });
    }

    const physicalNumber = parseStock(physicalStock);
    if (physicalNumber === null) {
      return res.status(400).json({
        message: "Stok fisik harus berupa angka bulat 0 atau lebih.",
      });
    }

    const dateValue = parseDate(opnameDate);
    if (dateValue === null) {
      return res.status(400).json({ message: "Tanggal opname tidak valid" });
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

    // Stok sistem diambil dari database (bukan dari client) dan dikunci
    // selama transaksi supaya selisih selalu akurat.
    const created = await sequelize.transaction(async (transaction) => {
      const item = await Item.findByPk(itemId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!item) throw new ServiceError(404, "Barang tidak ditemukan");

      const systemStock = item.stock;

      const record = await StockOpname.create(
        {
          itemId: item.id,
          systemStock,
          physicalStock: physicalNumber,
          difference: physicalNumber - systemStock,
          opnameDate: dateValue,
          notes: cleanNotes || null,
          userId: req.user.id,
        },
        { transaction },
      );

      await item.update({ stock: physicalNumber }, { transaction });

      return record;
    });

    const data = await StockOpname.findByPk(created.id, {
      include: includeRelations,
    });

    res.status(201).json({
      message: "Opname berhasil disimpan",
      data,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);

    res.status(500).json({
      message: "Gagal menyimpan opname",
    });
  }
}

module.exports = {
  getAll,
  create,
};