const Student = require("../../models/Student");
const {
  Class,
  Jurusan,
} = require("../../models");

async function getAll(req, res) {
  try {
    const data = await Student.findAll({
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
      order: [["name", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data siswa",
    });
  }
}

async function create(req, res) {
  try {
    const {
      nis,
      name,
      classId,
      jurusanId,
      generation,
    } = req.body;

    if (!nis || !name || !classId || !jurusanId || !generation) {
      return res.status(400).json({
        message: "Data siswa belum lengkap",
      });
    }

    const data = await Student.create({
      nis,
      name,
      classId,
      jurusanId,
      generation,
    });

    res.status(201).json({
      message: "Siswa berhasil ditambahkan",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menambahkan siswa",
    });
  }
}

async function update(req, res) {
  try {
    const data = await Student.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan",
      });
    }

    await data.update(req.body);

    res.json({
      message: "Data siswa berhasil diperbarui",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal memperbarui siswa",
    });
  }
}

async function remove(req, res) {
  try {
    const data = await Student.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Siswa berhasil dihapus",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menghapus siswa",
    });
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};