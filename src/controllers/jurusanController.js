const Jurusan = require("../../models/Jurusan");
const JURUSAN_STATUSES = ["Aktif", "Nonaktif", "Akan Datang"];

function validateStatus(status) {
  return JURUSAN_STATUSES.includes(status)
    ? null
    : "Status jurusan tidak valid.";
}

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
    const { nama, kode, status = "Aktif" } = req.body;

    if (!nama || !kode) {
      return res.status(400).json({
        message: "Nama dan kode wajib diisi",
      });
    }
    const statusError = validateStatus(status);
    if (statusError) return res.status(400).json({ message: statusError });

    const data = await Jurusan.create({
      nama,
      kode,
      status,
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
    const data = await Jurusan.findByPk(id);

    if (!data) {
      return res.status(404).json({
        message: "Jurusan tidak ditemukan",
      });
    }

    const nextStatus = req.body.status === undefined ? (data.status || "Aktif") : req.body.status;
    const statusError = validateStatus(nextStatus);
    if (statusError) return res.status(400).json({ message: statusError });

    await data.update({
      ...(req.body.nama !== undefined ? { nama: req.body.nama } : {}),
      ...(req.body.kode !== undefined ? { kode: req.body.kode } : {}),
      status: nextStatus,
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