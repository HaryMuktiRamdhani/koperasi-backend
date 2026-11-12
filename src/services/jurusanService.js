const Jurusan = require("../../models/Jurusan");
const ServiceError = require("./ServiceError");

const JURUSAN_STATUSES = ["Aktif", "Nonaktif", "Akan Datang"];

function validateStatus(status) {
  return JURUSAN_STATUSES.includes(status)
    ? null
    : "Status jurusan tidak valid.";
}

async function listJurusan() {
  return Jurusan.findAll({ order: [["nama", "ASC"]] });
}

async function createJurusan({ nama, kode, status = "Aktif" }) {
  if (!nama || !kode) {
    throw new ServiceError(400, "Nama dan kode wajib diisi");
  }
  const statusError = validateStatus(status);
  if (statusError) throw new ServiceError(400, statusError);

  return Jurusan.create({ nama, kode, status });
}

async function updateJurusan(id, changes) {
  const data = await Jurusan.findByPk(id);
  if (!data) throw new ServiceError(404, "Jurusan tidak ditemukan");

  const nextStatus =
    changes.status === undefined ? data.status || "Aktif" : changes.status;
  const statusError = validateStatus(nextStatus);
  if (statusError) throw new ServiceError(400, statusError);

  await data.update({
    ...(changes.nama !== undefined ? { nama: changes.nama } : {}),
    ...(changes.kode !== undefined ? { kode: changes.kode } : {}),
    status: nextStatus,
  });

  return data;
}

async function removeJurusan(id) {
  const data = await Jurusan.findByPk(id);
  if (!data) throw new ServiceError(404, "Jurusan tidak ditemukan");
  await data.destroy();
}

module.exports = {
  listJurusan,
  createJurusan,
  updateJurusan,
  removeJurusan,
};
