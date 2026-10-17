const Item = require("../../models/Item");
const ITEM_STATUSES = ["Aktif", "Nonaktif", "Akan Datang"];

function validateStatus(status) {
  return ITEM_STATUSES.includes(status) ? null : "Status barang tidak valid.";
}

async function getAll(req, res) {
  try {
    const data = await Item.findAll({
      order: [["name", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data barang",
    });
  }
}

async function create(req, res) {
  try {
    const { name, price, status = "Aktif" } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        message: "Nama dan harga wajib diisi",
      });
    }
    const statusError = validateStatus(status);
    if (statusError) return res.status(400).json({ message: statusError });

    const data = await Item.create({
      name,
      price,
      status,
    });

    res.status(201).json({
      message: "Barang berhasil ditambahkan",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menambahkan barang",
    });
  }
}

async function update(req, res) {
  try {
    const data = await Item.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    const nextStatus = req.body.status === undefined ? (data.status || "Aktif") : req.body.status;
    const statusError = validateStatus(nextStatus);
    if (statusError) return res.status(400).json({ message: statusError });

    await data.update({
      ...(req.body.name !== undefined ? { name: req.body.name } : {}),
      ...(req.body.price !== undefined ? { price: req.body.price } : {}),
      status: nextStatus,
    });

    res.json({
      message: "Barang berhasil diperbarui",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal memperbarui barang",
    });
  }
}

async function remove(req, res) {
  try {
    const data = await Item.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Barang berhasil dihapus",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menghapus barang",
    });
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};