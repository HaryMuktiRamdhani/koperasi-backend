const Bill = require("../../models/Bill");
const Student = require("../../models/Student");
const Item = require("../../models/Item");
const { Class, Jurusan } = require("../../models");
const sequelize = require("../config/database");

function validateBillInput({ amount, billDate, dueDate }) {
  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
    return "Nominal tagihan harus berupa bilangan bulat lebih dari 0.";
  }
  if (billDate && Number.isNaN(Date.parse(billDate))) {
    return "Tanggal tagihan tidak valid.";
  }
  if (dueDate && Number.isNaN(Date.parse(dueDate))) {
    return "Tanggal jatuh tempo tidak valid.";
  }
  if (billDate && dueDate && dueDate < billDate) {
    return "Tanggal jatuh tempo tidak boleh lebih awal dari tanggal tagihan.";
  }
  return null;
}

async function getAll(req, res) {
  try {
    const data = await Bill.findAll({
      include: [
        {
          model: Student,
          attributes: ["id", "nis", "name", "generation", "status", "classId", "jurusanId"],
          include: [
            { model: Class, attributes: ["id", "name", "level", "academicYear", "jurusanId"] },
            { model: Jurusan, attributes: ["id", "nama", "kode"] },
          ],
        },
        {
          model: Item,
          attributes: ["id", "name", "price"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data tagihan",
    });
  }
}

async function create(req, res) {
  try {
    const { studentId, itemId, amount, billDate = null, dueDate = null } = req.body;

    if (!studentId || !itemId || amount === undefined) {
      return res.status(400).json({
        message: "Data tagihan belum lengkap",
      });
    }

    const validationError = validateBillInput({ amount, billDate, dueDate });
    if (validationError) return res.status(400).json({ message: validationError });

    const student = await Student.findByPk(studentId);

    if (!student) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan",
      });
    }
    if (student.status !== "Aktif") {
      return res.status(400).json({
        message: "Tagihan hanya dapat dibuat untuk siswa berstatus Aktif.",
      });
    }

    const item = await Item.findByPk(itemId);

    if (!item) {
      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    const data = await Bill.create({
      studentId,
      itemId,
      amount,
      status: "Belum Bayar",
      billDate,
      dueDate,
    });

    res.status(201).json({
      message: "Tagihan berhasil dibuat",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal membuat tagihan",
    });
  }
}

async function update(req, res) {
  try {
    const data = await Bill.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Tagihan tidak ditemukan",
      });
    }

    const nextValues = {
      studentId: req.body.studentId || data.studentId,
      itemId: req.body.itemId || data.itemId,
      amount: req.body.amount ?? data.amount,
      billDate: req.body.billDate === undefined ? data.billDate : req.body.billDate,
      dueDate: req.body.dueDate === undefined ? data.dueDate : req.body.dueDate,
    };
    const validationError = validateBillInput(nextValues);
    if (validationError) return res.status(400).json({ message: validationError });
    if (!nextValues.studentId || !nextValues.itemId) {
      return res.status(400).json({ message: "Siswa dan barang wajib dipilih." });
    }
    const [student, item] = await Promise.all([
      Student.findByPk(nextValues.studentId),
      Item.findByPk(nextValues.itemId),
    ]);
    if (!student) return res.status(404).json({ message: "Siswa tidak ditemukan" });
    if (!item) return res.status(404).json({ message: "Barang tidak ditemukan" });

    await data.update(nextValues);

    res.json({
      message: "Tagihan berhasil diperbarui",
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal memperbarui tagihan",
    });
  }
}

async function createBulk(req, res) {
    const { studentIds, itemId, amount, billDate = null, dueDate = null } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0 || !itemId || amount === undefined) {
      return res.status(400).json({ message: "Pilih minimal satu siswa, barang, dan nominal tagihan." });
    }
    const uniqueStudentIds = [...new Set(studentIds)];
    if (uniqueStudentIds.length !== studentIds.length) {
      return res.status(400).json({ message: "Daftar siswa mengandung pilihan duplikat." });
    }
    const validationError = validateBillInput({ amount, billDate, dueDate });
    if (validationError) return res.status(400).json({ message: validationError });

    const transaction = await sequelize.transaction();
    try {
      const [students, item] = await Promise.all([
        Student.findAll({ where: { id: uniqueStudentIds, status: "Aktif" }, transaction }),
        Item.findByPk(itemId, { transaction }),
      ]);
      if (!item) {
        await transaction.rollback();
        return res.status(404).json({ message: "Barang tidak ditemukan" });
      }
      if (students.length !== uniqueStudentIds.length) {
        await transaction.rollback();
        return res.status(400).json({ message: "Semua siswa harus ditemukan dan berstatus Aktif." });
      }

      const existing = await Bill.findAll({
        where: { studentId: uniqueStudentIds, itemId },
        attributes: ["studentId"],
        transaction,
      });
      if (existing.length > 0) {
        await transaction.rollback();
        return res.status(409).json({ message: "Sebagian siswa sudah memiliki tagihan untuk barang tersebut." });
      }

      const rows = await Bill.bulkCreate(
        uniqueStudentIds.map((studentId) => ({
          studentId,
          itemId,
          amount: Number(amount),
          billDate,
          dueDate,
          status: "Belum Bayar",
        })),
        { transaction },
      );
      await transaction.commit();
      return res.status(201).json({
        message: `${rows.length} tagihan berhasil dibuat`,
        data: rows,
        count: rows.length,
      });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ message: "Gagal membuat tagihan massal" });
  }
}

async function remove(req, res) {
  try {
    const data = await Bill.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Tagihan tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Tagihan berhasil dihapus",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menghapus tagihan",
    });
  }
}

module.exports = {
  getAll,
  create,
  createBulk,
  update,
  remove,
};