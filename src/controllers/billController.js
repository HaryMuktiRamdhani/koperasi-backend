
const Bill = require("../../models/Bill");
const Student = require("../../models/Student");
const Item = require("../../models/Item");
const { Class, Jurusan } = require("../../models");
const sequelize = require("../config/database");

function validateBillInput({ quantity, billDate, dueDate }) {
  const numericQuantity = Number(quantity);

  if (!Number.isInteger(numericQuantity) || numericQuantity < 1) {
    return "Quantity harus berupa bilangan bulat minimal 1.";
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
          attributes: [
            "id",
            "nis",
            "name",
            "generation",
            "status",
            "classId",
            "jurusanId",
          ],
          include: [
            {
              model: Class,
              attributes: ["id", "name", "level", "academicYear", "jurusanId"],
            },
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
    const {
      studentId,
      itemId,
      quantity = 1,
      billDate = null,
      dueDate = null,
    } = req.body;

    if (!studentId || !itemId) {
      return res.status(400).json({
        message: "Siswa dan barang wajib dipilih.",
      });
    }

    const validationError = validateBillInput({
      quantity,
      billDate,
      dueDate,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const [student, item] = await Promise.all([
      Student.findByPk(studentId),
      Item.findByPk(itemId),
    ]);

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

    if (!item) {
      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    if (item.status !== "Aktif") {
      return res.status(400).json({
        message: "Barang tidak aktif dan tidak dapat ditagihkan.",
      });
    }

    const totalAmount = item.price * Number(quantity);

    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        message: "Total tagihan tidak valid.",
      });
    }

    const data = await Bill.create({
      studentId,
      itemId,
      quantity: Number(quantity),
      amount: totalAmount,
      status: "Belum Bayar",
      billDate,
      dueDate,
    });

    return res.status(201).json({
      message: "Tagihan berhasil dibuat",
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
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

    if (data.status === "Lunas") {
      return res.status(400).json({
        message: "Tagihan yang sudah lunas tidak dapat diubah.",
      });
    }

    const nextValues = {
      studentId: req.body.studentId || data.studentId,
      itemId: req.body.itemId || data.itemId,
      quantity: req.body.quantity ?? data.quantity,
      billDate:
        req.body.billDate === undefined ? data.billDate : req.body.billDate,
      dueDate:
        req.body.dueDate === undefined ? data.dueDate : req.body.dueDate,
    };

    const validationError = validateBillInput(nextValues);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (!nextValues.studentId || !nextValues.itemId) {
      return res.status(400).json({
        message: "Siswa dan barang wajib dipilih.",
      });
    }

    const [student, item] = await Promise.all([
      Student.findByPk(nextValues.studentId),
      Item.findByPk(nextValues.itemId),
    ]);

    if (!student) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan",
      });
    }

    if (student.status !== "Aktif") {
      return res.status(400).json({
        message: "Siswa harus berstatus Aktif.",
      });
    }

    if (!item) {
      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    if (item.status !== "Aktif") {
      return res.status(400).json({
        message: "Barang tidak aktif dan tidak dapat ditagihkan.",
      });
    }

    const totalAmount = item.price * Number(nextValues.quantity);

    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        message: "Total tagihan tidak valid.",
      });
    }

    await data.update({
      ...nextValues,
      quantity: Number(nextValues.quantity),
      amount: totalAmount,
    });

    return res.json({
      message: "Tagihan berhasil diperbarui",
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Gagal memperbarui tagihan",
    });
  }
}

async function createBulk(req, res) {
  const {
    studentIds,
    itemId,
    quantity = 1,
    billDate = null,
    dueDate = null,
  } = req.body;

  if (
    !Array.isArray(studentIds) ||
    studentIds.length === 0 ||
    !itemId
  ) {
    return res.status(400).json({
      message: "Pilih minimal satu siswa dan satu barang.",
    });
  }

  const uniqueStudentIds = [...new Set(studentIds)];

  if (uniqueStudentIds.length !== studentIds.length) {
    return res.status(400).json({
      message: "Daftar siswa mengandung pilihan duplikat.",
    });
  }

  const validationError = validateBillInput({
    quantity,
    billDate,
    dueDate,
  });

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const transaction = await sequelize.transaction();

  try {
    const [students, item] = await Promise.all([
      Student.findAll({
        where: {
          id: uniqueStudentIds,
          status: "Aktif",
        },
        transaction,
      }),
      Item.findByPk(itemId, { transaction }),
    ]);

    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    if (item.status !== "Aktif") {
      await transaction.rollback();
      return res.status(400).json({
        message: "Barang tidak aktif dan tidak dapat ditagihkan.",
      });
    }

    if (students.length !== uniqueStudentIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Semua siswa harus ditemukan dan berstatus Aktif.",
      });
    }

    const totalAmount = item.price * Number(quantity);

    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Total tagihan tidak valid.",
      });
    }

    const existing = await Bill.findAll({
      where: {
        studentId: uniqueStudentIds,
        itemId,
      },
      attributes: ["studentId"],
      transaction,
    });

    if (existing.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        message:
          "Sebagian siswa sudah memiliki tagihan untuk barang tersebut.",
      });
    }

    const rows = await Bill.bulkCreate(
      uniqueStudentIds.map((studentId) => ({
        studentId,
        itemId,
        quantity: Number(quantity),
        amount: totalAmount,
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
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(error);
    return res.status(500).json({
      message: "Gagal membuat tagihan massal",
    });
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

    if (data.status === "Lunas") {
      return res.status(400).json({
        message: "Tagihan yang sudah lunas tidak dapat dihapus.",
      });
    }

    await data.destroy();

    return res.json({
      message: "Tagihan berhasil dihapus",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
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
