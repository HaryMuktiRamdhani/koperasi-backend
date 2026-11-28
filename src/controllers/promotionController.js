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
// Kelas tujuan boleh berstatus Aktif atau Akan datang (kelas yang disiapkan
// untuk tahun ajaran berikutnya). Kelas "Akan datang" otomatis menjadi Aktif
// ketika sudah menerima siswa.
const DESTINATION_STATUSES = ["Aktif", "Akan datang"];
// Nilai khusus pada pilihan kelas tujuan: kelas tujuan dibuat otomatis
const AUTO_DESTINATION = "auto";
// Kelas asal yang sudah kosong setelah proses kenaikan otomatis diarsipkan
const ARCHIVED_CLASS_STATUS = "Lulus/Arsip";
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

// Membaca periode kelas (mis. 2025/2028 atau 2026/2027)
function parseClassPeriod(cls) {
  const match =
    typeof cls.academicYear === "string"
      ? cls.academicYear.match(/^(\d{4})\/(\d{4})$/)
      : null;
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]) };
}

// Periode kelas (mis. 2025/2028 atau 2026/2027) mencakup tahun ajaran tertentu
function classCoversYear(cls, startYear) {
  const period = parseClassPeriod(cls);
  if (!period) return false;
  return period.start <= startYear && startYear < period.end;
}

/*
 * Kelas masih relevan sebagai kelas tujuan apabila periodenya belum
 * berakhir sebelum tahun ajaran asal dan belum dimulai setelah tahun
 * ajaran tujuan. Kelas dengan periode yang berbeda dari tahun ajaran
 * tujuan (mis. kelas XII angkatan lama 2024/2027 yang dipakai kembali)
 * tetap boleh dipilih; perbedaannya hanya ditampilkan sebagai peringatan.
 * Kelas dengan format periode lama tetap ditampilkan agar bisa dipilih.
 */
function classIsRelevant(cls, fromStart, toStart) {
  const period = parseClassPeriod(cls);
  if (!period) return true;
  return period.start <= toStart && period.end > fromStart;
}

function classSuffix(name) {
  return String(name || "")
    .trim()
    .replace(/^(XII|XI|X)\s+/i, "")
    .trim()
    .toLowerCase();
}

/*
 * Kelas tujuan otomatis: tingkat berikutnya, nomor rombel yang sama,
 * jurusan yang sama, dan angkatan (periode) yang sama dengan kelas asal.
 * Contoh: "XI MPLB 1" (2025/2028) -> "XII MPLB 1" (2025/2028).
 */
function buildAutoDestination(cls, nextLevel) {
  const rawSuffix = String(cls.name || "")
    .trim()
    .replace(/^(XII|XI|X)\s+/i, "")
    .trim();

  return {
    name: rawSuffix ? `${nextLevel} ${rawSuffix}` : nextLevel,
    academicYear: cls.academicYear,
  };
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

/**
 * Menentukan kelas tujuan yang disarankan.
 *
 * Prioritas:
 * 1. Kelas dengan periode tepat sama dengan tahun ajaran tujuan.
 * 2. Kelas dengan angkatan (periode) yang sama seperti kelas asal.
 * 3. Kelas tujuan baru yang dibuat otomatis (angkatan sama dengan kelas asal).
 * 4. Kelas yang periodenya mencakup tahun ajaran tujuan.
 * 5. Kelas dengan nomor rombel yang sama apabila hanya ada satu pilihan.
 *
 * Pada tiap prioritas kelas yang sudah ada, jika ada beberapa kelas,
 * dipilih yang nomor rombelnya sama dengan kelas asal apabila unik.
 *
 * Pemilihan kelas tujuan tetap bisa diubah secara manual oleh pengguna.
 */
function suggestDestination(sourceClass, destinations, toYear, autoDestination) {
  const sourceSuffix = classSuffix(sourceClass.name);

  const pickFromTier = (tier) => {
    if (tier.length === 1) return tier[0].id;

    if (tier.length > 1) {
      const sameNumber = tier.filter(
        (item) => classSuffix(item.name) === sourceSuffix,
      );

      if (sameNumber.length === 1) return sameNumber[0].id;
    }

    return null;
  };

  const exactYear = pickFromTier(
    destinations.filter((item) => item.academicYear === toYear),
  );
  if (exactYear) return exactYear;

  const sameCohort = pickFromTier(
    destinations.filter((item) => item.sameCohort),
  );
  if (sameCohort) return sameCohort;

  if (autoDestination) return AUTO_DESTINATION;

  const covering = pickFromTier(
    destinations.filter((item) => item.coversTargetYear),
  );
  if (covering) return covering;

  const sameNumber = destinations.filter(
    (item) => classSuffix(item.name) === sourceSuffix,
  );

  return sameNumber.length === 1 ? sameNumber[0].id : null;
}

// Urutan tampilan kelas tujuan: yang paling sesuai berada di paling atas.
function destinationRank(item, toYear) {
  if (item.academicYear === toYear) return 0;
  if (item.sameCohort) return 1;
  if (item.coversTargetYear) return 2;
  return 3;
}

async function loadContext(fromYear, transaction) {
  const from = parseSchoolYear(fromYear);
  const fromStart = from.start;
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
                DESTINATION_STATUSES.includes(candidate.status) &&
                classIsRelevant(candidate, fromStart, toStart) &&
                classAcceptsJurusan(
                  candidate,
                  jurusanId,
                  jurusanSetByClass.get(candidate.id),
                ),
            )
            .map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              academicYear: candidate.academicYear,

              // Hanya digunakan untuk prioritas rekomendasi dan peringatan,
              // bukan untuk menentukan valid/tidaknya kelas tujuan.
              sameCohort: candidate.academicYear === cls.academicYear,
              coversTargetYear: classCoversYear(candidate, toStart),
            }))
            .sort(
              (a, b) =>
                destinationRank(a, toYear) - destinationRank(b, toYear) ||
                a.name.localeCompare(b.name, "id", { numeric: true }),
            )
        : [];

      // Kelas tujuan otomatis hanya ditawarkan apabila jurusan jelas dan
      // kelas dengan nama + angkatan yang sama belum ada.
      let autoDestination = null;

      if (nextLevel && jurusanId) {
        const candidate = buildAutoDestination(cls, nextLevel);

        const alreadyExists = destinations.some(
          (item) =>
            item.name.trim().toLowerCase() ===
              candidate.name.toLowerCase() &&
            item.academicYear === candidate.academicYear,
        );

        autoDestination = alreadyExists ? null : candidate;
      }

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
        autoDestination,
        suggestedDestinationId: suggestDestination(
          cls,
          destinations,
          toYear,
          autoDestination,
        ),
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
  const periodWarnings = new Set();
  const occupiedWarnings = new Set();
  const seen = new Set();
  const actionByStudent = new Map();

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
    actionByStudent.set(studentId, action);

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

    let destination = null;
    let autoCreated = false;

    if (destinationId === AUTO_DESTINATION) {
      if (group.autoDestination) {
        autoCreated = true;

        destination = {
          id: null,
          name: group.autoDestination.name,
          academicYear: group.autoDestination.academicYear,
          coversTargetYear: true,
        };
      }
    } else {
      destination = group.destinations.find(
        (item) => item.id === destinationId,
      );
    }

    if (!destination) {
      if (!classErrors.has(group.classId)) {
        classErrors.add(group.classId);

        errors.push(
          `Kelas tujuan untuk ${group.className} tidak valid atau tidak tersedia.`,
        );
      }

      return;
    }

    if (autoCreated) {
      const noticeKey = `auto:${group.classId}`;

      if (!periodWarnings.has(noticeKey)) {
        periodWarnings.add(noticeKey);

        warnings.push(
          `Kelas ${destination.name} (${destination.academicYear}) akan dibuat otomatis sebagai kelas tujuan ${group.className}.`,
        );
      }
    } else if (!destination.coversTargetYear) {
      /*
       * Perbedaan periode kelas asal dan tujuan bukan alasan untuk menolak
       * kenaikan (kelas lama sering dipakai kembali oleh angkatan berikutnya).
       * Pengguna hanya diberi peringatan agar memeriksa kembali pilihannya.
       */
      const warningKey = `${group.classId}:${destination.id}`;

      if (!periodWarnings.has(warningKey)) {
        periodWarnings.add(warningKey);

        warnings.push(
          `Periode kelas tujuan ${destination.name} (${destination.academicYear}) tidak mencakup tahun ajaran ${context.toYear}. Pastikan kelas tersebut memang akan digunakan oleh siswa ${group.className}.`,
        );
      }
    }

    summary.promote += 1;

    rows.push({
      ...base,
      action: ACTION_LABEL.promote,
      toClassId: destination.id,
      toClassName: destination.name,
      toLevel: group.nextLevel,
      toStatus: "Aktif",
      autoCreated,
    });
  });

  /*
   * Peringatan kelas tujuan yang masih berisi siswa aktif lain
   * (tinggal kelas, tidak diproses, sudah diproses, atau tidak ikut batch).
   * Hanya informasi; tidak menghalangi proses kenaikan.
   */
  const usedDestinationIds = [
    ...new Set(
      rows
        .filter((row) => row.action === ACTION_LABEL.promote && row.toClassId)
        .map((row) => row.toClassId),
    ),
  ];

  usedDestinationIds.forEach((destinationId) => {
    const occupiedGroup = context.groups.find(
      (group) => group.classId === destinationId,
    );

    if (!occupiedGroup || occupiedWarnings.has(destinationId)) return;

    const remainingStudents = occupiedGroup.students.filter(
      (student) =>
        student.locked || actionByStudent.get(student.id) !== "promote",
    );

    if (remainingStudents.length > 0) {
      occupiedWarnings.add(destinationId);

      warnings.push(
        `Kelas tujuan ${occupiedGroup.className} masih berisi ${remainingStudents.length} siswa aktif lain yang tidak ikut naik kelas atau lulus pada proses ini, sehingga kelas tersebut akan berisi siswa dari beberapa angkatan.`,
      );
    }
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
      (destinationId !== AUTO_DESTINATION && !UUID_PATTERN.test(destinationId))
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

      // 0. Buat kelas tujuan otomatis (atau pakai kelas yang sudah ada)
      const autoClassByGroup = new Map();
      let createdClasses = 0;

      for (const row of plan.rows) {
        if (!row.autoCreated) continue;

        if (!autoClassByGroup.has(row.fromClassId)) {
          const group = context.groups.find(
            (item) => item.classId === row.fromClassId,
          );

          let target = await Class.findOne({
            where: {
              name: group.autoDestination.name,
              level: group.nextLevel,
              academicYear: group.autoDestination.academicYear,
              jurusanId: group.jurusanId,
              status: { [Op.in]: DESTINATION_STATUSES },
            },
            transaction,
          });

          if (!target) {
            target = await Class.create(
              {
                name: group.autoDestination.name,
                level: group.nextLevel,
                academicYear: group.autoDestination.academicYear,
                jurusanId: group.jurusanId,
                status: "Aktif",
              },
              { transaction },
            );

            createdClasses += 1;
          }

          autoClassByGroup.set(row.fromClassId, target);
        }

        const target = autoClassByGroup.get(row.fromClassId);

        row.toClassId = target.id;
        row.toClassName = target.name;
      }

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

      // Kelas tujuan berstatus "Akan datang" menjadi Aktif setelah menerima siswa
      if (idsByDestination.size) {
        await Class.update(
          { status: "Aktif" },
          {
            where: {
              id: [...idsByDestination.keys()],
              status: "Akan datang",
            },
            transaction,
          },
        );
      }

      // 2. Siswa kelas XII ditandai Lulus (calon alumni); kelasnya tidak diubah
      if (alumniIds.length) {
        await Student.update(
          { status: "Lulus" },
          { where: { id: alumniIds }, transaction },
        );
      }

      // 2b. Kelas asal yang sudah kosong (semua siswanya naik/lulus) diarsipkan
      const emptiedClassIds = [
        ...new Set(
          plan.rows
            .filter(
              (row) =>
                row.action === ACTION_LABEL.promote ||
                row.action === ACTION_LABEL.alumni,
            )
            .map((row) => row.fromClassId),
        ),
      ];

      for (const classId of emptiedClassIds) {
        const remaining = await Student.count({
          where: { classId, status: "Aktif" },
          transaction,
        });

        if (remaining === 0) {
          await Class.update(
            { status: ARCHIVED_CLASS_STATUS },
            { where: { id: classId, status: "Aktif" }, transaction },
          );
        }
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
        createdClasses,
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
      createdClasses: result.createdClasses,
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