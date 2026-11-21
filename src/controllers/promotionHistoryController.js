const { Op, fn, col, literal } = require("sequelize");
const {
  Class,
  Jurusan,
  Student,
  StudentPromotion,
} = require("../../models");

const LEVELS = ["X", "XI", "XII"];
const DECISIONS = ["Naik Kelas", "Tinggal Kelas", "Calon Alumni", "Tidak Diproses"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function isSchoolYear(value) {
  const match =
    typeof value === "string" ? value.match(/^(\d{4})\/(\d{4})$/) : null;
  return Boolean(match) && Number(match[2]) === Number(match[1]) + 1;
}

function positiveInt(value, fallback, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return fallback;
  return Math.min(number, max);
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// "Tidak Diproses" yang kemudian diganti keputusan nyata pada tahun ajaran yang
// sama tidak ikut dihitung/ditampilkan (tetap ada di timeline siswa).
const NOT_SUPERSEDED = literal(`NOT (
  "StudentPromotion"."action" = 'Tidak Diproses'
  AND EXISTS (
    SELECT 1 FROM "student_promotions" AS "later"
     WHERE "later"."studentId" = "StudentPromotion"."studentId"
       AND "later"."fromAcademicYear" = "StudentPromotion"."fromAcademicYear"
       AND "later"."action" <> 'Tidak Diproses'
  )
)`);

function toItem(row) {
  return {
    id: row.id,
    batchId: row.batchId,
    studentId: row.studentId,
    nis: row.studentNis || "-",
    name: row.studentName || "-",
    jurusanId: row.jurusanId,
    jurusanName: row.jurusanName,
    jurusanCode: row.jurusanCode,
    fromClassName: row.fromClassName,
    toClassName: row.toClassName,
    fromLevel: row.fromLevel,
    toLevel: row.toLevel,
    action: row.action,
    fromAcademicYear: row.fromAcademicYear,
    toAcademicYear: row.toAcademicYear,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    processedAt: row.createdAt,
    processedByName: row.processedByName,
  };
}

// Filter tahun ajaran, tingkat (kelas asal), jurusan, keputusan, dan pencarian
function buildWhere(filters, { withDecision }) {
  const conditions = [NOT_SUPERSEDED];
  if (filters.academicYear) {
    conditions.push({ fromAcademicYear: filters.academicYear });
  }
  if (filters.level) conditions.push({ fromLevel: filters.level });
  if (filters.jurusanId) conditions.push({ jurusanId: filters.jurusanId });
  if (withDecision && filters.action) {
    conditions.push({ action: filters.action });
  }
  if (filters.search) {
    const pattern = `%${escapeLike(filters.search)}%`;
    conditions.push({
      [Op.or]: [
        { studentName: { [Op.iLike]: pattern } },
        { studentNis: { [Op.iLike]: pattern } },
      ],
    });
  }
  return { [Op.and]: conditions };
}

async function getHistory(req, res) {
  try {
    const query = req.query;

    // Tahun ajaran: tidak dikirim = terbaru, "all" = semua tahun ajaran
    let academicYear = "";
    if (query.academicYear === undefined) {
      const latest = await StudentPromotion.findOne({
        attributes: ["fromAcademicYear"],
        order: [["fromAcademicYear", "DESC"]],
        raw: true,
      });
      academicYear = latest ? latest.fromAcademicYear : "";
    } else if (query.academicYear !== "all" && query.academicYear !== "") {
      if (!isSchoolYear(query.academicYear)) {
        return res.status(400).json({ message: "Tahun ajaran tidak valid." });
      }
      academicYear = query.academicYear;
    }

    const level = query.level || "";
    if (level && !LEVELS.includes(level)) {
      return res.status(400).json({ message: "Tingkat kelas tidak valid." });
    }

    const jurusanId = query.jurusanId || "";
    if (jurusanId && !UUID_PATTERN.test(jurusanId)) {
      return res.status(400).json({ message: "Jurusan tidak valid." });
    }

    const action = query.action || "";
    if (action && !DECISIONS.includes(action)) {
      return res.status(400).json({ message: "Keputusan tidak valid." });
    }

    const search =
      typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";

    const filters = { academicYear, level, jurusanId, action, search };
    const page = positiveInt(query.page, 1, 1000000);
    const pageSize = positiveInt(query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const [listResult, summaryRows, yearRows, jurusanRows] = await Promise.all([
      StudentPromotion.findAndCountAll({
        where: buildWhere(filters, { withDecision: true }),
        order: [
          ["createdAt", "DESC"],
          ["studentName", "ASC"],
          ["id", "ASC"],
        ],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        raw: true,
      }),
      // Ringkasan mengikuti filter lain, tetapi tidak filter keputusan
      StudentPromotion.findAll({
        attributes: ["action", [fn("COUNT", col("id")), "count"]],
        where: buildWhere(filters, { withDecision: false }),
        group: ["action"],
        raw: true,
      }),
      StudentPromotion.findAll({
        attributes: [
          "fromAcademicYear",
          "toAcademicYear",
          [fn("COUNT", col("id")), "total"],
        ],
        group: ["fromAcademicYear", "toAcademicYear"],
        order: [["fromAcademicYear", "DESC"]],
        raw: true,
      }),
      StudentPromotion.findAll({
        attributes: ["jurusanId", "jurusanName", "jurusanCode"],
        where: { jurusanId: { [Op.ne]: null } },
        group: ["jurusanId", "jurusanName", "jurusanCode"],
        order: [["jurusanName", "ASC"]],
        raw: true,
      }),
    ]);

    const counts = {};
    summaryRows.forEach((row) => {
      counts[row.action] = Number(row.count);
    });
    const summary = {
      promote: counts["Naik Kelas"] || 0,
      stay: counts["Tinggal Kelas"] || 0,
      alumni: counts["Calon Alumni"] || 0,
      skip: counts["Tidak Diproses"] || 0,
    };
    summary.total =
      summary.promote + summary.stay + summary.alumni + summary.skip;

    res.json({
      appliedAcademicYear: academicYear || "all",
      items: listResult.rows.map(toItem),
      summary,
      pagination: {
        page,
        pageSize,
        total: listResult.count,
        pageCount: Math.max(1, Math.ceil(listResult.count / pageSize)),
      },
      options: {
        academicYears: yearRows.map((row) => ({
          from: row.fromAcademicYear,
          to: row.toAcademicYear,
          total: Number(row.total),
        })),
        jurusan: jurusanRows.map((row) => ({
          id: row.jurusanId,
          name: row.jurusanName,
          code: row.jurusanCode,
        })),
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil riwayat kenaikan siswa",
    });
  }
}

async function getHistoryDetail(req, res) {
  try {
    if (!UUID_PATTERN.test(req.params.id)) {
      return res.status(400).json({ message: "ID riwayat tidak valid." });
    }

    const row = await StudentPromotion.findByPk(req.params.id, { raw: true });
    if (!row) {
      return res.status(404).json({ message: "Riwayat tidak ditemukan." });
    }

    const [timeline, batchSize, student] = await Promise.all([
      StudentPromotion.findAll({
        where: { studentId: row.studentId },
        order: [
          ["createdAt", "ASC"],
          ["id", "ASC"],
        ],
        raw: true,
      }),
      StudentPromotion.count({ where: { batchId: row.batchId } }),
      Student.findByPk(row.studentId, {
        attributes: ["id", "nis", "name", "status"],
        include: [
          { model: Class, attributes: ["id", "name", "level", "academicYear"] },
          { model: Jurusan, attributes: ["id", "nama", "kode"] },
        ],
      }),
    ]);

    res.json({
      item: toItem(row),
      batch: { id: row.batchId, size: batchSize },
      student: student
        ? {
            id: student.id,
            nis: student.nis,
            name: student.name,
            status: student.status,
            className: student.Class ? student.Class.name : null,
            jurusanName: student.Jurusan ? student.Jurusan.nama : null,
          }
        : null,
      timeline: timeline.map(toItem),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil detail riwayat kenaikan",
    });
  }
}

module.exports = {
  getHistory,
  getHistoryDetail,
};