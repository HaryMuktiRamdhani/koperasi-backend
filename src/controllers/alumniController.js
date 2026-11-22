const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  Bill,
  Class,
  Item,
  Jurusan,
  Payment,
  Student,
  StudentPromotion,
} = require("../../models");

// Alumni = siswa berstatus "Lulus". Status ini hanya diberikan oleh fitur
// Kenaikan Siswa (kelas XII -> Calon Alumni), lihat studentController.
const ALUMNI_STATUS = "Lulus";
const ALUMNI_ACTION = "Calon Alumni";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const MAX_TRANSACTION_ROWS = 200;

// Dasar daftar alumni. Tahun kelulusan = tahun akhir tahun ajaran saat siswa
// diproses menjadi Calon Alumni; jika tidak ada catatan kenaikan (data lama),
// dipakai tahun akhir periode kelas terakhir.
const ALUMNI_CTE = `
WITH alumni AS (
  SELECT s."id", s."nis", s."name", s."gender", s."generation", s."jurusanId",
         j."nama" AS "jurusanName", j."kode" AS "jurusanCode",
         s."classId", c."name" AS "lastClassName",
         pr."fromAcademicYear" AS "graduationAcademicYear",
         pr."createdAt" AS "graduatedAt",
         COALESCE(
           CASE WHEN split_part(pr."fromAcademicYear", '/', 2) ~ '^[0-9]{4}$'
                THEN split_part(pr."fromAcademicYear", '/', 2)::int END,
           CASE WHEN split_part(c."academicYear", '/', 2) ~ '^[0-9]{4}$'
                THEN split_part(c."academicYear", '/', 2)::int END
         ) AS "graduationYear"
    FROM "students" AS s
    LEFT JOIN "classes" AS c ON c."id" = s."classId"
    LEFT JOIN "jurusan" AS j ON j."id" = s."jurusanId"
    LEFT JOIN LATERAL (
      SELECT sp."fromAcademicYear", sp."createdAt"
        FROM "student_promotions" AS sp
       WHERE sp."studentId" = s."id" AND sp."action" = '${ALUMNI_ACTION}'
       ORDER BY sp."createdAt" DESC
       LIMIT 1
    ) AS pr ON TRUE
   WHERE s."status" = '${ALUMNI_STATUS}'
)`;

function positiveInt(value, fallback, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return fallback;
  return Math.min(number, max);
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function endYear(academicYear) {
  const match =
    typeof academicYear === "string"
      ? academicYear.match(/^\d{4}\/(\d{4})$/)
      : null;
  return match ? Number(match[1]) : null;
}

function toListItem(row) {
  return {
    id: row.id,
    nis: row.nis,
    name: row.name,
    gender: row.gender,
    jurusanId: row.jurusanId,
    jurusanName: row.jurusanName,
    jurusanCode: row.jurusanCode,
    generation: row.generation,
    lastClassName: row.lastClassName,
    graduationYear: row.graduationYear,
    graduatedAt: row.graduatedAt,
  };
}

function toPromotionItem(row) {
  return {
    id: row.id,
    batchId: row.batchId,
    fromAcademicYear: row.fromAcademicYear,
    toAcademicYear: row.toAcademicYear,
    fromClassName: row.fromClassName,
    toClassName: row.toClassName,
    fromLevel: row.fromLevel,
    toLevel: row.toLevel,
    action: row.action,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    processedAt: row.createdAt,
    processedByName: row.processedByName,
  };
}

function buildFilter(filters) {
  const clauses = [];
  const replacements = {};

  if (filters.search) {
    clauses.push(`("nis" ILIKE :search OR "name" ILIKE :search)`);
    replacements.search = `%${escapeLike(filters.search)}%`;
  }
  if (filters.jurusanId) {
    clauses.push(`"jurusanId" = :jurusanId`);
    replacements.jurusanId = filters.jurusanId;
  }
  if (filters.generation) {
    clauses.push(`"generation" = :generation`);
    replacements.generation = filters.generation;
  }
  if (filters.graduationYear) {
    clauses.push(`"graduationYear" = :graduationYear`);
    replacements.graduationYear = filters.graduationYear;
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    replacements,
  };
}

// Pencarian, filter, dan pagination seluruhnya diproses di database
async function getAll(req, res) {
  try {
    const query = req.query;

    const search =
      typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";

    const jurusanId = query.jurusanId || "";
    if (jurusanId && !UUID_PATTERN.test(jurusanId)) {
      return res.status(400).json({ message: "Jurusan tidak valid." });
    }

    const generation =
      typeof query.generation === "string" ? query.generation.trim() : "";
    if (generation.length > 20) {
      return res.status(400).json({ message: "Angkatan tidak valid." });
    }

    let graduationYear = null;
    if (query.graduationYear !== undefined && query.graduationYear !== "") {
      graduationYear = Number(query.graduationYear);
      if (
        !Number.isInteger(graduationYear) ||
        graduationYear < 2000 ||
        graduationYear > 2100
      ) {
        return res.status(400).json({ message: "Tahun kelulusan tidak valid." });
      }
    }

    const page = positiveInt(query.page, 1, 1000000);
    const pageSize = positiveInt(query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const { where, replacements } = buildFilter({
      search,
      jurusanId,
      generation,
      graduationYear,
    });
    const run = (sql, extra = {}) =>
      sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: { ...replacements, ...extra },
      });

    const [rows, countRows, summaryRows, jurusanRows, generationRows, yearRows] =
      await Promise.all([
        run(
          `${ALUMNI_CTE}
           SELECT * FROM alumni ${where}
           ORDER BY "graduationYear" DESC NULLS LAST, "name" ASC, "id" ASC
           LIMIT :limit OFFSET :offset`,
          { limit: pageSize, offset: (page - 1) * pageSize },
        ),
        run(`${ALUMNI_CTE} SELECT COUNT(*)::int AS total FROM alumni ${where}`),
        // Ringkasan seluruh alumni (tidak dipengaruhi filter)
        sequelize.query(
          `${ALUMNI_CTE}
           SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE "gender" = 'Laki-laki')::int AS male,
                  COUNT(*) FILTER (WHERE "gender" = 'Perempuan')::int AS female
             FROM alumni`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `${ALUMNI_CTE}
           SELECT DISTINCT "jurusanId" AS id, "jurusanName" AS name, "jurusanCode" AS code
             FROM alumni WHERE "jurusanId" IS NOT NULL ORDER BY name ASC`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `${ALUMNI_CTE}
           SELECT DISTINCT "generation" FROM alumni ORDER BY "generation" DESC`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `${ALUMNI_CTE}
           SELECT DISTINCT "graduationYear" FROM alumni
            WHERE "graduationYear" IS NOT NULL ORDER BY "graduationYear" DESC`,
          { type: QueryTypes.SELECT },
        ),
      ]);

    const total = countRows[0].total;
    const summary = summaryRows[0];

    res.json({
      items: rows.map(toListItem),
      summary: {
        total: summary.total,
        male: summary.male,
        female: summary.female,
        genderMissing: summary.total - summary.male - summary.female,
      },
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
      },
      options: {
        jurusan: jurusanRows,
        generations: generationRows.map((row) => row.generation),
        graduationYears: yearRows.map((row) => row.graduationYear),
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data alumni",
    });
  }
}

async function getById(req, res) {
  try {
    if (!UUID_PATTERN.test(req.params.id)) {
      return res.status(400).json({ message: "ID alumni tidak valid." });
    }

    // Hanya siswa berstatus alumni yang dapat dibuka di sini
    const student = await Student.findOne({
      where: { id: req.params.id, status: ALUMNI_STATUS },
      include: [
        { model: Class, attributes: ["id", "name", "level", "academicYear"] },
        { model: Jurusan, attributes: ["id", "nama", "kode"] },
      ],
    });
    if (!student) {
      return res.status(404).json({ message: "Alumni tidak ditemukan." });
    }

    const money = { type: QueryTypes.SELECT, replacements: { id: student.id } };
    const [promotions, bills, payments, billTotals, paymentTotals] =
      await Promise.all([
        StudentPromotion.findAll({
          where: { studentId: student.id },
          order: [
            ["createdAt", "ASC"],
            ["id", "ASC"],
          ],
          raw: true,
        }),
        Bill.findAll({
          where: { studentId: student.id },
          include: [{ model: Item, attributes: ["id", "name"] }],
          order: [["createdAt", "DESC"]],
          limit: MAX_TRANSACTION_ROWS,
        }),
        Payment.findAll({
          include: [
            {
              model: Bill,
              attributes: ["id", "studentId"],
              where: { studentId: student.id },
              required: true,
              include: [{ model: Item, attributes: ["id", "name"] }],
            },
          ],
          order: [
            ["paymentDate", "DESC"],
            ["createdAt", "DESC"],
          ],
          limit: MAX_TRANSACTION_ROWS,
        }),
        sequelize.query(
          `SELECT COUNT(*)::int AS "billCount",
                  COALESCE(SUM("amount"), 0)::bigint AS "totalBilled",
                  COUNT(*) FILTER (WHERE "status" <> 'Lunas')::int AS "unpaidCount",
                  COALESCE(SUM("amount") FILTER (WHERE "status" <> 'Lunas'), 0)::bigint AS "unpaidAmount"
             FROM "bills" WHERE "studentId" = :id`,
          money,
        ),
        sequelize.query(
          `SELECT COUNT(*)::int AS "paymentCount",
                  COALESCE(SUM(p."amount"), 0)::bigint AS "totalPaid"
             FROM "payments" AS p
             JOIN "bills" AS b ON b."id" = p."billId"
            WHERE b."studentId" = :id`,
          money,
        ),
      ]);

    const graduation = [...promotions]
      .reverse()
      .find((row) => row.action === ALUMNI_ACTION);
    const graduationYear = graduation
      ? endYear(graduation.fromAcademicYear)
      : endYear(student.Class ? student.Class.academicYear : null);

    res.json({
      alumni: {
        id: student.id,
        nis: student.nis,
        name: student.name,
        gender: student.gender,
        generation: student.generation,
        jurusanId: student.Jurusan ? student.Jurusan.id : null,
        jurusanName: student.Jurusan ? student.Jurusan.nama : null,
        jurusanCode: student.Jurusan ? student.Jurusan.kode : null,
        lastClassName: student.Class ? student.Class.name : null,
        lastClassAcademicYear: student.Class ? student.Class.academicYear : null,
        graduationYear,
        graduationAcademicYear: graduation ? graduation.fromAcademicYear : null,
        graduatedAt: graduation ? graduation.createdAt : null,
        processedByName: graduation ? graduation.processedByName : null,
        // false = status Lulus pada data lama, tanpa catatan Kenaikan Siswa
        viaPromotion: Boolean(graduation),
      },
      promotions: promotions.map(toPromotionItem),
      koperasi: {
        summary: {
          billCount: billTotals[0].billCount,
          totalBilled: Number(billTotals[0].totalBilled),
          unpaidCount: billTotals[0].unpaidCount,
          unpaidAmount: Number(billTotals[0].unpaidAmount),
          paymentCount: paymentTotals[0].paymentCount,
          totalPaid: Number(paymentTotals[0].totalPaid),
        },
        bills: bills.map((bill) => ({
          id: bill.id,
          itemName: bill.Item ? bill.Item.name : null,
          amount: bill.amount,
          billDate: bill.billDate,
          dueDate: bill.dueDate,
          status: bill.status,
        })),
        payments: payments.map((payment) => ({
          id: payment.id,
          billId: payment.billId,
          itemName:
            payment.Bill && payment.Bill.Item ? payment.Bill.Item.name : null,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentDate: payment.paymentDate,
          notes: payment.notes,
        })),
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil detail alumni",
    });
  }
}

module.exports = {
  getAll,
  getById,
};