const {
  listJurusan,
  createJurusan,
  updateJurusan,
  removeJurusan,
} = require("../services/jurusanService");
const ServiceError = require("../services/ServiceError");

function handleServiceError(error, res, fallbackMessage) {
  if (error instanceof ServiceError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

async function getAll(req, res) {
  try {
    return res.json(await listJurusan());
  } catch (error) {
    return handleServiceError(error, res, "Gagal mengambil data jurusan");
  }
}

async function create(req, res) {
  try {
    const data = await createJurusan(req.body);
    return res.status(201).json({
      message: "Jurusan berhasil ditambahkan",
      data,
    });
  } catch (error) {
    return handleServiceError(error, res, "Gagal menambahkan jurusan");
  }
}

async function update(req, res) {
  try {
    const data = await updateJurusan(req.params.id, req.body);
    return res.json({
      message: "Jurusan berhasil diperbarui",
      data,
    });
  } catch (error) {
    return handleServiceError(error, res, "Gagal memperbarui jurusan");
  }
}

async function remove(req, res) {
  try {
    await removeJurusan(req.params.id);
    return res.json({
      message: "Jurusan berhasil dihapus",
    });
  } catch (error) {
    return handleServiceError(error, res, "Gagal menghapus jurusan");
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};
