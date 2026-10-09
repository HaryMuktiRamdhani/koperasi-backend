const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const { User } = require("../../models");

const publicAttributes = ["id", "name", "email", "role", "isActive", "createdAt", "updatedAt"];

function getUserPayload(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  return { name, email };
}

async function getAll(req, res) {
  try {
    const { search = "", role, isActive } = req.query;
    const where = {};

    if (search.trim()) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search.trim()}%` } },
        { email: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    if (role === "admin" || role === "staff") where.role = role;
    if (isActive === "true" || isActive === "false") where.isActive = isActive === "true";

    const users = await User.findAll({
      where,
      attributes: publicAttributes,
      order: [["createdAt", "DESC"]],
    });

    return res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ message: "Gagal mengambil data pengguna" });
  }
}

async function create(req, res) {
  try {
    const { name, email } = getUserPayload(req.body);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const role = req.body.role === "staff" ? "staff" : req.body.role === "admin" ? "admin" : "";

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Nama, email, password, dan role wajib diisi" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password minimal terdiri dari 8 karakter" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email sudah terdaftar" });

    const user = await User.create({
      name,
      email,
      role,
      password: await bcrypt.hash(password, 10),
      isActive: true,
    });

    return res.status(201).json({ message: "Pengguna berhasil dibuat", data: await User.findByPk(user.id, { attributes: publicAttributes }) });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ message: "Gagal membuat pengguna" });
  }
}

async function update(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan" });

    const { name, email } = getUserPayload(req.body);
    const role = req.body.role === "staff" || req.body.role === "admin" ? req.body.role : user.role;
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !email) return res.status(400).json({ message: "Nama dan email wajib diisi" });

    const duplicate = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
    if (duplicate) return res.status(409).json({ message: "Email sudah terdaftar" });
    if (user.id === req.user.id && role !== user.role) {
      return res.status(400).json({ message: "Role akun sendiri tidak dapat diubah" });
    }
    if (password && password.length < 8) {
      return res.status(400).json({ message: "Password minimal terdiri dari 8 karakter" });
    }

    const updates = { name, email, role };
    if (password) updates.password = await bcrypt.hash(password, 10);
    await user.update(updates);

    return res.json({ message: "Pengguna berhasil diperbarui", data: await User.findByPk(user.id, { attributes: publicAttributes }) });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ message: "Gagal memperbarui pengguna" });
  }
}

async function updateStatus(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    if (user.id === req.user.id && req.body.isActive === false) {
      return res.status(400).json({ message: "Anda tidak dapat menonaktifkan akun sendiri" });
    }

    const nextStatus = Boolean(req.body.isActive);
    if (!nextStatus && user.role === "admin") {
      const activeAdminCount = await User.count({ where: { role: "admin", isActive: true } });
      if (activeAdminCount <= 1) return res.status(400).json({ message: "Admin terakhir tidak dapat dinonaktifkan" });
    }

    await user.update({ isActive: nextStatus });
    return res.json({ message: "Status pengguna berhasil diperbarui", data: await User.findByPk(user.id, { attributes: publicAttributes }) });
  } catch (error) {
    console.error("Update user status error:", error);
    return res.status(500).json({ message: "Gagal memperbarui status pengguna" });
  }
}

async function getProfile(req, res) {
  const user = await User.findByPk(req.user.id, { attributes: publicAttributes });
  return res.json(user);
}

async function updateProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    const { name, email } = getUserPayload(req.body);
    if (!user || !name || !email) return res.status(400).json({ message: "Nama dan email wajib diisi" });

    const duplicate = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
    if (duplicate) return res.status(409).json({ message: "Email sudah terdaftar" });

    await user.update({ name, email });
    return res.json({ message: "Profil berhasil diperbarui", data: await User.findByPk(user.id, { attributes: publicAttributes }) });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Gagal memperbarui profil" });
  }
}

module.exports = { getAll, create, update, updateStatus, getProfile, updateProfile };
