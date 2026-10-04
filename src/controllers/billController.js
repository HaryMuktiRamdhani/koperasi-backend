const Bill = require("../../models/Bill");
const Student = require("../../models/Student");
const Item = require("../../models/Item");

async function getAll(req, res) {
  try {
    const data = await Bill.findAll({
      include: [
        {
          model: Student,
          attributes: ["id", "nis", "name"],
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
      amount,
    } = req.body;

    if (!studentId || !itemId || amount === undefined) {
      return res.status(400).json({
        message: "Data tagihan belum lengkap",
      });
    }

    const student = await Student.findByPk(studentId);

    if (!student) {
      return res.status(404).json({
        message: "Siswa tidak ditemukan",
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

    await data.update(req.body);

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
  update,
  remove,
};