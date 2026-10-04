const Jurusan = require("../../models/Jurusan");

async function getAll(req, res) {
  try {
    const data = await Jurusan.findAll({
      order: [["nama", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data jurusan",
    });
  }
}

async function create(req, res) {
  try {
    const { nama, kode } = req.body;

    if (!nama || !kode) {
      return res.status(400).json({
        message: "Nama dan kode wajib diisi",
      });
    }

    const data = await Jurusan.create({
      nama,
      kode,
    });

    res.status(201).json({
      message: "Jurusan berhasil ditambahkan",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menambahkan jurusan",
    });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { nama, kode, isActive } = req.body;

    const data = await Jurusan.findByPk(id);

    if (!data) {
      return res.status(404).json({
        message: "Jurusan tidak ditemukan",
      });
    }

    await data.update({
      nama,
      kode,
      isActive,
    });

    res.json({
      message: "Jurusan berhasil diperbarui",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal memperbarui jurusan",
    });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    const data = await Jurusan.findByPk(id);

    if (!data) {
      return res.status(404).json({
        message: "Jurusan tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Jurusan berhasil dihapus",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menghapus jurusan",
    });
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};