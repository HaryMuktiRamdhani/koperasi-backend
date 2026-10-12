const Student = require("../../models/Student");
const {
  Class,
  Jurusan,
} = require("../../models");

async function validateClassJurusan(classId, jurusanId) {
  const selectedClass = await Class.findByPk(classId, {
    attributes: ["id"],
  });

  if (!selectedClass) {
    return "Kelas tidak ditemukan.";
  }

  const selectedJurusan = await Jurusan.findByPk(jurusanId, {
    attributes: ["id"],
  });

  if (!selectedJurusan) {
    return "Jurusan tidak ditemukan.";
  }

  const existingRelations = await Student.findAll({
    where: { classId },
    attributes: ["jurusanId"],
    raw: true,
  });
  const knownJurusanIds = new Set(existingRelations.map((student) => student.jurusanId));

  if (knownJurusanIds.size > 0 && !knownJurusanIds.has(jurusanId)) {
    return "Jurusan tidak sesuai dengan relasi yang sudah tersimpan untuk kelas ini.";
  }

  return null;
}

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
      status,
    } = req.body;

    if (!nis || !name || !classId || !jurusanId || !generation) {
      return res.status(400).json({
        message: "Data siswa belum lengkap",
      });
    }

    const relationError = await validateClassJurusan(classId, jurusanId);
    if (relationError) {
      return res.status(400).json({ message: relationError });
    }

    const data = await Student.create({
      nis,
      name,
      classId,
      jurusanId,
      generation,
      ...(status ? { status } : {}),
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

    if (req.body.classId || req.body.jurusanId) {
      const relationError = await validateClassJurusan(
        req.body.classId || data.classId,
        req.body.jurusanId || data.jurusanId,
      );
      if (relationError) {
        return res.status(400).json({ message: relationError });
      }
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