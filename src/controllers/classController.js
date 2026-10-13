const { Class, Student, Jurusan } = require("../../models");

const CLASS_STATUSES = ["Aktif", "Akan datang", "Nonaktif", "Lulus/Arsip"];

function parseAcademicYear(value) {
  const match = typeof value === "string" ? value.match(/^(\d{4})\/(\d{4})$/) : null;
  return match ? { start: Number(match[1]), end: Number(match[2]) } : null;
}

function validateClassInput({ level, jurusanId, name, academicYear, status }) {
  if (!["X", "XI", "XII"].includes(level)) return "Tingkat harus X, XI, atau XII.";
  if (!jurusanId || !name || !academicYear) return "Nama, tingkat, jurusan, dan tahun ajaran wajib diisi.";
  if (status && !CLASS_STATUSES.includes(status)) return "Status kelas tidak valid.";
  const years = parseAcademicYear(academicYear);
  if (!years || years.end <= years.start) return "Format tahun ajaran harus YYYY/YYYY dan tahun selesai harus lebih besar.";
  return null;
}

async function getAll(req, res) {
  try {
    const data = await Class.findAll({
      include: [
        {
          model: Student,
          attributes: ["jurusanId"],
          required: false,
        },
        {
          model: Jurusan,
          attributes: ["id", "nama", "kode"],
          required: false,
        },
      ],
      order: [["name", "ASC"]],
    });

    res.json(
      data.map((item) => {
        const plainItem = item.toJSON();
        const jurusanIds = [
          ...new Set((plainItem.Students || []).map((student) => student.jurusanId)),
        ];

        delete plainItem.Students;
        return {
          ...plainItem,
          jurusanIds: plainItem.jurusanId ? [plainItem.jurusanId] : jurusanIds,
          studentCount: (item.Students || []).length,
        };
      }),
    );
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data kelas",
    });
  }
}

async function create(req, res) {
  try {
    const { name, level, jurusanId, academicYear, status = "Aktif" } = req.body;

    const validationError = validateClassInput({ name, level, jurusanId, academicYear, status });
    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const data = await Class.create({
      name,
      level,
      jurusanId,
      academicYear,
      status,
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

    const payload = {
      name: req.body.name,
      level: req.body.level,
      jurusanId: req.body.jurusanId || data.jurusanId,
      academicYear: req.body.academicYear,
      status: req.body.status || data.status,
    };
    const validationError = validateClassInput(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    await data.update(payload);

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

    const studentCount = await Student.count({ where: { classId: data.id } });
    if (studentCount > 0) {
      return res.status(409).json({
        message: `Kelas tidak dapat dihapus karena masih digunakan oleh ${studentCount} siswa. Ubah statusnya menjadi Lulus/Arsip atau Nonaktif.`,
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