const crypto = require("crypto");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const {
  Class,
  Jurusan,
  Student,
  StudentPromotion,
  User,
} = require("../../models");
const ServiceError = require("../services/ServiceError");

const LEVELS = ["X", "XI", "XII"];
const NEXT_LEVEL = { X: "XI", XI: "XII", XII: null };
const ACTIONS = ["promote", "stay", "skip"];
const MAX_ITEMS = 5000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Kunci advisory lock agar dua proses kenaikan tidak berjalan bersamaan.
const PROMOTION_LOCK_KEY = 20260303;

const ACTION_LABEL = {
  promote: "Naik Kelas",
  stay: "Tinggal Kelas",
  alumni: "Calon Alumni",
  skip: "Tidak Diproses",
};

/* ------------------------------ Tahun ajaran ----------------------------- */

function parseSchoolYear(value) {
  const match =
    typeof value === "string" ? value.match(/^(\d{4})\/(\d{4})$/) : null;
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end !== start + 1 || start < 2000 || start > 2100) return null;
  return { start, end };
}

function formatSchoolYear(start) {
  return `${start}/${start + 1}`;
}

// Tahun ajaran dimulai bulan Juli
function defaultSchoolYearStart(now = new Date()) {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

// Periode kelas (mis. 2025/2028 atau 2026/2027) mencakup tahun ajaran tertentu
function classCoversYear(cls, startYear) {
  const match =
    typeof cls.academicYear === "string"
      ? cls.academicYear.match(/^(\d{4})\/(\d{4})$/)
      : null;
  if (!match) return false;
  return Number(match[1]) <= startYear && startYear < Number(match[2]);
}

function classSuffix(name) {
  return String(name || "").replace(/^(XII|XI|X)\s+/, "");
}

/* ------------------------------- Konteks data ---------------------------- */

function groupJurusanId(cls, jurusanSet) {
  if (cls.jurusanId) return cls.jurusanId;
  return jurusanSet && jurusanSet.size === 1 ? [...jurusanSet][0] : null;
}

// Mengikuti aturan validateClassJurusan pada studentController
function classAcceptsJurusan(candidate, jurusanId, jurusanSet) {
  if (!jurusanId) return false;
  if (candidate.jurusanId) return candidate.jurusanId === jurusanId;
  return !jurusanSet || jurusanSet.size === 0 || jurusanSet.has(jurusanId);
}

function suggestDestination(sourceClass, destinations) {
  const sameCohort = destinations.filter((item) => item.sameCohort);
  if (sameCohort.length === 1) return sameCohort[0].id;
  if (sameCohort.length > 1) {
    const sameNumber = sameCohort.filter(
      (item) => classSuffix(item.name) === classSuffix(sourceClass.name),
    );
    if (sameNumber.length === 1) return sameNumber[0].id;
  }
  return null;
}

async function loadContext(fromYear, transaction) {
  const from = parseSchoolYear(fromYear);
  const toStart = from.start + 1;
  const toYear = formatSchoolYear(toStart);
  const options = transaction ? { transaction } : {};

  const classes = await Class.findAll({
    attributes: ["id", "name", "level", "academicYear", "jurusanId", "status"],
    raw: true,
    ...options,
  });
  const students = await Student.findAll({
    attributes: ["id", "nis", "name", "classId", "jurusanId", "generation", "status"],
    order: [["name", "ASC"]],
    raw: true,
    ...options,
  });
  const jurusanList = await Jurusan.findAll({
    attributes: ["id", "nama", "kode"],
    raw: true,
    ...options,
  });
  const processed = await StudentPromotion.findAll({
    where: {
      [Op.and]: [
        {
          [Op.or]: [{ fromAcademicYear: fromYear }, { toAcademicYear: toYear }],
        },
        // Keputusan "Tidak Diproses" hanya riwayat; tidak mengunci siswa
        { action: { [Op.ne]: ACTION_LABEL.skip } },
      ],
    },
    attributes: ["studentId", "action", "fromAcademicYear", "toAcademicYear"],
    raw: true,
    ...options,
  });

  const jurusanById = new Map(jurusanList.map((item) => [item.id, item]));
  const processedByStudent = new Map(
    processed.map((item) => [item.studentId, item]),
  );

  const jurusanSetByClass = new Map();
  const activeStudentsByClass = new Map();
  students.forEach((student) => {
    if (!jurusanSetByClass.has(student.classId)) {
      jurusanSetByClass.set(student.classId, new Set());
    }
    jurusanSetByClass.get(student.classId).add(student.jurusanId);
    if (student.status === "Aktif") {
      if (!activeStudentsByClass.has(student.classId)) {
        activeStudentsByClass.set(student.classId, []);
      }
      activeStudentsByClass.get(student.classId).push(student);
    }
  });

  const levelOrder = (level) => LEVELS.indexOf(level);
  const groups = classes
    .filter(
      (cls) =>
        cls.status === "Aktif" &&
        LEVELS.includes(cls.level) &&
        activeStudentsByClass.has(cls.id),
    )
    .sort(
      (a, b) =>
        levelOrder(a.level) - levelOrder(b.level) ||
        a.name.localeCompare(b.name, "id", { numeric: true }),
    )
    .map((cls) => {
      const jurusanSet = jurusanSetByClass.get(cls.id);
      const jurusanId = groupJurusanId(cls, jurusanSet);
      const jurusan = jurusanId ? jurusanById.get(jurusanId) : null;
      const nextLevel = NEXT_LEVEL[cls.level];

      const destinations = nextLevel
        ? classes
            .filter(
              (candidate) =>
                candidate.id !== cls.id &&
                candidate.level === nextLevel &&
                candidate.status === "Aktif" &&
                classCoversYear(candidate, toStart) &&
                classAcceptsJurusan(
                  candidate,
                  jurusanId,
                  jurusanSetByClass.get(candidate.id),
                ),
            )
            .sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true }))
            .map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              academicYear: candidate.academicYear,
              sameCohort: candidate.academicYear === cls.academicYear,
            }))
        : [];

      return {
        classId: cls.id,
        className: cls.name,
        level: cls.level,
        nextLevel,
        academicYear: cls.academicYear,
        jurusanId,
        jurusanName: jurusan ? jurusan.nama : null,
        jurusanCode: jurusan ? jurusan.kode : null,
        mixedJurusan: !jurusanId,
        destinations,
        suggestedDestinationId: suggestDestination(cls, destinations),
        students: activeStudentsByClass.get(cls.id).map((student) => {
          const record = processedByStudent.get(student.id);
          return {
            id: student.id,
            nis: student.nis,
            name: student.name,
            generation: student.generation,
            jurusanId: student.jurusanId,
            locked: Boolean(record),
            lockedReason: record
              ? `Sudah diproses (${record.action}) untuk tahun ajaran ${record.fromAcademicYear} → ${record.toAcademicYear}.`
              : null,
          };
        }),
      };
    });

  const studentIndex = new Map();
  groups.forEach((group) => {
    group.students.forEach((student) => {
      studentIndex.set(student.id, { student, group });
    });
  });

  return {
    fromYear,
    toYear,
    toStart,
    groups,
    studentIndex,
    jurusanById,
    classById: new Map(classes.map((item) => [item.id, item])),
  };
}

/* ------------------------------ Rencana & preview ------------------------ */

// Salinan data siswa/jurusan saat proses, agar riwayat tetap utuh walau data berubah
function snapshotFields(context, student) {
  const jurusan = context.jurusanById.get(student.jurusanId);
  return {
    studentNis: student.nis,
    studentName: student.name,
    jurusanId: student.jurusanId || null,
    jurusanName: jurusan ? jurusan.nama : null,
    jurusanCode: jurusan ? jurusan.kode : null,
  };
}

function baseRow(context, student, group) {
  return {
    studentId: student.id,
    nis: student.nis,
    name: student.name,
    fromClassId: group.classId,
    fromClassName: group.className,
    fromLevel: group.level,
    fromStatus: "Aktif",
    ...snapshotFields(context, student),
  };
}

function buildPlan(context, payload) {
  const errors = [];
  const warnings = [];
  const rows = [];
  const skipRows = [];
  const summary = { promote: 0, stay: 0, alumni: 0, skip: 0 };
  const classErrors = new Set();
  const classWarnings = new Set();
  const seen = new Set();

  const items = Array.isArray(payload.items) ? payload.items : [];
  const destinations =
    payload.destinations && typeof payload.destinations === "object"
      ? payload.destinations
      : {};

  items.forEach((item) => {
    const studentId = item && item.studentId;
    const action = item && item.action;

    if (!ACTIONS.includes(action)) {
      errors.push("Pilihan aksi siswa tidak valid.");
      return;
    }
    if (seen.has(studentId)) {
      errors.push("Terdapat siswa yang dipilih lebih dari satu kali.");
      return;
    }
    seen.add(studentId);

    if (action === "skip") {
      summary.skip += 1;
      // Keputusan "Tidak Diproses" dicatat sebagai riwayat (tanpa mengubah siswa)
      const skipEntry = context.studentIndex.get(studentId);
      if (skipEntry && !skipEntry.student.locked) {
        skipRows.push({
          ...baseRow(context, skipEntry.student, skipEntry.group),
          action: ACTION_LABEL.skip,
          toClassId: skipEntry.group.classId,
          toClassName: skipEntry.group.className,
          toLevel: skipEntry.group.level,
          toStatus: "Aktif",
        });
      }
      return;
    }

    const entry = context.studentIndex.get(studentId);
    if (!entry) {
      errors.push(
        "Ada siswa yang tidak memenuhi syarat diproses (tidak aktif atau kelasnya tidak aktif).",
      );
      return;
    }

    const { student, group } = entry;
    if (student.locked) {
      errors.push(
        `${student.name} (${student.nis}) sudah diproses pada tahun ajaran ini.`,
      );
      return;
    }

    const base = baseRow(context, student, group);

    if (action === "stay") {
      summary.stay += 1;
      rows.push({
        ...base,
        action: ACTION_LABEL.stay,
        toClassId: group.classId,
        toClassName: group.className,
        toLevel: group.level,
        toStatus: "Aktif",
      });
      return;
    }

    // action === "promote"
    if (!group.nextLevel) {
      summary.alumni += 1;
      rows.push({
        ...base,
        action: ACTION_LABEL.alumni,
        toClassId: group.classId,
        toClassName: group.className,
        toLevel: "Alumni",
        toStatus: "Lulus",
      });
      return;
    }

    if (group.mixedJurusan) {
      if (!classErrors.has(group.classId)) {
        classErrors.add(group.classId);
        errors.push(
          `Kelas ${group.className} berisi siswa dari beberapa jurusan. Lengkapi jurusan kelas terlebih dahulu.`,
        );
      }
      return;
    }

    const destinationId = destinations[group.classId];
    if (!destinationId) {
      if (!classErrors.has(group.classId)) {
        classErrors.add(group.classId);
        errors.push(
          group.destinations.length
            ? `Kelas tujuan untuk ${group.className} belum dipilih.`
            : `Kelas tujuan ${group.nextLevel} tahun ajaran ${context.toYear} untuk ${group.className} belum tersedia. Tambahkan kelas tersebut di halaman Kelas.`,
        );
      }
      return;
    }

    const destination = group.destinations.find(
      (item) => item.id === destinationId,
    );
    if (!destination) {
      if (!classErrors.has(group.classId)) {
        classErrors.add(group.classId);
        errors.push(
          `Kelas tujuan untuk ${group.className} tidak valid atau tidak tersedia.`,
        );
      }
      return;
    }

    if (!destination.sameCohort && !classWarnings.has(group.classId)) {
      classWarnings.add(group.classId);
      warnings.push(
        `Kelas tujuan ${destination.name} (${destination.academicYear}) memiliki periode berbeda dari kelas asal ${group.className} (${group.academicYear}).`,
      );
    }

    summary.promote += 1;
    rows.push({
      ...base,
      action: ACTION_LABEL.promote,
      toClassId: destination.id,
      toClassName: destination.name,
      toLevel: group.nextLevel,
      toStatus: "Aktif",
    });
  });

  if (!rows.length && !errors.length) {
    errors.push("Belum ada siswa yang dipilih untuk diproses.");
  }

  return {
    valid: errors.length === 0 && rows.length > 0,
    summary,
    rows,
    skipRows,
    errors: [...new Set(errors)],
    warnings,
  };
}

function parsePayload(body) {
  const fromYear = body && body.fromAcademicYear;
  if (!parseSchoolYear(fromYear)) {
    throw new ServiceError(
      400,
      "Tahun ajaran tidak valid. Gunakan format YYYY/YYYY dengan selisih satu tahun.",
    );
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    throw new ServiceError(400, "Daftar siswa kosong atau terlalu banyak.");
  }
  items.forEach((item) => {
    if (
      !item ||
      typeof item.studentId !== "string" ||
      !UUID_PATTERN.test(item.studentId)
    ) {
      throw new ServiceError(400, "Data siswa tidak valid.");
    }
  });

  const destinations = body.destinations || {};
  if (typeof destinations !== "object" || Array.isArray(destinations)) {
    throw new ServiceError(400, "Data kelas tujuan tidak valid.");
  }
  Object.entries(destinations).forEach(([classId, destinationId]) => {
    if (
      !UUID_PATTERN.test(classId) ||
      typeof destinationId !== "string" ||
      !UUID_PATTERN.test(destinationId)
    ) {
      throw new ServiceError(400, "Data kelas tujuan tidak valid.");
    }
  });

  return { fromYear, items, destinations };
}

/* --------------------------------- Handler ------------------------------- */

async function getEligible(req, res) {
  try {
    const fromYear =
      req.query.fromYear ||
      formatSchoolYear(defaultSchoolYearStart());

    if (!parseSchoolYear(fromYear)) {
      return res.status(400).json({
        message:
          "Tahun ajaran tidak valid. Gunakan format YYYY/YYYY dengan selisih satu tahun.",
      });
    }

    const context = await loadContext(fromYear);

    res.json({
      fromAcademicYear: context.fromYear,
      toAcademicYear: context.toYear,
      defaultFromAcademicYear: formatSchoolYear(defaultSchoolYearStart()),
      groups: context.groups,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data kenaikan siswa",
    });
  }
}

async function preview(req, res) {
  try {
    const { fromYear, items, destinations } = parsePayload(req.body);
    const context = await loadContext(fromYear);
    const plan = buildPlan(context, { items, destinations });
    const publicPlan = { ...plan };
    delete publicPlan.skipRows;

    res.json({
      fromAcademicYear: context.fromYear,
      toAcademicYear: context.toYear,
      ...publicPlan,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error(error);

    res.status(500).json({
      message: "Gagal membuat preview kenaikan siswa",
    });
  }
}

async function commit(req, res) {
  try {
    const { fromYear, items, destinations } = parsePayload(req.body);
    const studentIds = [
      ...new Set(
        items
          .filter((item) => item.action !== "skip")
          .map((item) => item.studentId),
      ),
    ];

    const result = await sequelize.transaction(async (transaction) => {
      // Satu antrean untuk semua proses kenaikan (dilepas saat commit/rollback)
      await sequelize.query("SELECT pg_advisory_xact_lock(:key)", {
        replacements: { key: PROMOTION_LOCK_KEY },
        transaction,
      });

      // Kunci baris siswa agar tidak berubah oleh proses lain selama transaksi
      if (studentIds.length) {
        await Student.findAll({
          attributes: ["id"],
          where: { id: studentIds },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
      }

      // Validasi ulang di dalam transaksi dengan data terbaru
      const context = await loadContext(fromYear, transaction);
      const plan = buildPlan(context, { items, destinations });
      if (!plan.valid) return { plan, applied: false };

      const batchId = crypto.randomUUID();

      // 1. Pindahkan siswa yang naik kelas (dikelompokkan per kelas tujuan)
      const idsByDestination = new Map();
      const alumniIds = [];
      plan.rows.forEach((row) => {
        if (row.action === ACTION_LABEL.promote) {
          if (!idsByDestination.has(row.toClassId)) {
            idsByDestination.set(row.toClassId, []);
          }
          idsByDestination.get(row.toClassId).push(row.studentId);
        } else if (row.action === ACTION_LABEL.alumni) {
          alumniIds.push(row.studentId);
        }
      });

      for (const [classId, ids] of idsByDestination) {
        await Student.update(
          { classId },
          { where: { id: ids }, transaction },
        );
      }
      // 2. Siswa kelas XII ditandai Lulus (calon alumni); kelasnya tidak diubah
      if (alumniIds.length) {
        await Student.update(
          { status: "Lulus" },
          { where: { id: alumniIds }, transaction },
        );
      }

      // 3. Simpan riwayat kelas lama sebelum/bersamaan dengan perubahan
      //    (termasuk keputusan "Tidak Diproses")
      const processedBy = await User.findByPk(req.user.id, {
        attributes: ["name"],
        transaction,
      });
      await StudentPromotion.bulkCreate(
        [...plan.rows, ...plan.skipRows].map((row) => ({
          batchId,
          studentId: row.studentId,
          fromClassId: row.fromClassId,
          toClassId: row.toClassId,
          fromClassName: row.fromClassName,
          toClassName: row.toClassName,
          fromLevel: row.fromLevel,
          toLevel: row.toLevel,
          action: row.action,
          fromAcademicYear: context.fromYear,
          toAcademicYear: context.toYear,
          fromStatus: row.fromStatus,
          toStatus: row.toStatus,
          userId: req.user.id,
          studentNis: row.studentNis,
          studentName: row.studentName,
          jurusanId: row.jurusanId,
          jurusanName: row.jurusanName,
          jurusanCode: row.jurusanCode,
          processedByName: processedBy ? processedBy.name : null,
        })),
        { transaction },
      );

      return {
        plan,
        applied: true,
        batchId,
        fromAcademicYear: context.fromYear,
        toAcademicYear: context.toYear,
      };
    });

    if (!result.applied) {
      return res.status(400).json({
        message: "Kenaikan siswa tidak dapat diproses.",
        errors: result.plan.errors,
      });
    }

    res.status(201).json({
      message: "Kenaikan siswa berhasil diproses",
      batchId: result.batchId,
      fromAcademicYear: result.fromAcademicYear,
      toAcademicYear: result.toAcademicYear,
      summary: result.plan.summary,
      processed: result.plan.rows.length,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ message: error.message });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message:
          "Sebagian siswa sudah diproses pada tahun ajaran ini. Muat ulang daftar lalu coba lagi.",
      });
    }

    console.error(error);

    res.status(500).json({
      message: "Gagal memproses kenaikan siswa",
    });
  }
}

module.exports = {
  getEligible,
  preview,
  commit,
};