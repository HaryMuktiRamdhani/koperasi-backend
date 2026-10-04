const Item = require("../../models/Item");

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
    const { name, price } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        message: "Nama dan harga wajib diisi",
      });
    }

    const data = await Item.create({
      name,
      price,
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

    await data.update(req.body);

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