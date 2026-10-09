const { Op } = require("sequelize");
const { Student, Class, Jurusan, Item, Bill, Payment } = require("../../models");

async function search(req, res) {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!query) return res.json([]);

    const pattern = `%${query}%`;
    const [students, jurusan, classes, items, bills, payments] = await Promise.all([
      Student.findAll({ where: { [Op.or]: [{ nis: { [Op.iLike]: pattern } }, { name: { [Op.iLike]: pattern } }] }, attributes: ["id", "nis", "name"], limit: 5 }),
      Jurusan.findAll({ where: { [Op.or]: [{ nama: { [Op.iLike]: pattern } }, { kode: { [Op.iLike]: pattern } }] }, attributes: ["id", "nama", "kode"], limit: 5 }),
      Class.findAll({ where: { name: { [Op.iLike]: pattern } }, attributes: ["id", "name", "level", "academicYear"], limit: 5 }),
      Item.findAll({ where: { name: { [Op.iLike]: pattern } }, attributes: ["id", "name", "price"], limit: 5 }),
      Bill.findAll({ where: { status: { [Op.iLike]: pattern } }, attributes: ["id", "amount", "status"], limit: 5 }),
      Payment.findAll({ where: { paymentMethod: { [Op.iLike]: pattern } }, attributes: ["id", "amount", "paymentMethod", "paymentDate"], limit: 5 }),
    ]);

    return res.json([
      ...students.map((item) => ({ id: item.id, label: item.name, detail: `NIS ${item.nis}`, category: "Siswa", path: "/students" })),
      ...jurusan.map((item) => ({ id: item.id, label: item.nama, detail: item.kode, category: "Jurusan", path: "/jurusan" })),
      ...classes.map((item) => ({ id: item.id, label: item.name, detail: `${item.level} · ${item.academicYear}`, category: "Kelas", path: "/classes" })),
      ...items.map((item) => ({ id: item.id, label: item.name, detail: `Rp ${Number(item.price).toLocaleString("id-ID")}`, category: "Barang", path: "/items" })),
      ...bills.map((item) => ({ id: item.id, label: `Tagihan ${item.id.slice(0, 8)}`, detail: `${item.status} · Rp ${Number(item.amount).toLocaleString("id-ID")}`, category: "Tagihan", path: "/bills" })),
      ...payments.map((item) => ({ id: item.id, label: `Pembayaran ${item.id.slice(0, 8)}`, detail: `${item.paymentMethod} · Rp ${Number(item.amount).toLocaleString("id-ID")}`, category: "Pembayaran", path: "/payments" })),
    ]);
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ message: "Gagal melakukan pencarian" });
  }
}

module.exports = { search };
