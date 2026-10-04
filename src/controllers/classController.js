const Class = require("../../models/Class");

async function getAll(req, res) {
  try {
    const data = await Class.findAll({
      order: [["name", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data kelas",
    });
  }
}

async function create(req, res) {
  try {
    const { name, level, academicYear } = req.body;

    if (!name || !level || !academicYear) {
      return res.status(400).json({
        message: "Nama, tingkat, dan tahun ajaran wajib diisi",
      });
    }

    const data = await Class.create({
      name,
      level,
      academicYear,
    });

    res.status(201).json({
      message: "Kelas berhasil ditambahkan",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menambahkan kelas",
    });
  }
}

async function update(req, res) {
  try {
    const data = await Class.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Kelas tidak ditemukan",
      });
    }

    await data.update(req.body);

    res.json({
      message: "Kelas berhasil diperbarui",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal memperbarui kelas",
    });
  }
}

async function remove(req, res) {
  try {
    const data = await Class.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Kelas tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Kelas berhasil dihapus",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menghapus kelas",
    });
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};