const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const { User, Session } = require("../../models");
const { getPolicyRow } = require("./securityController");
const { validatePassword } = require("../utils/passwordPolicy");

const publicAttributes = [
  "id",
  "name",
  "email",
  "role",
  "isActive",
  "username",
  "phone",
  "bio",
  "avatarUrl",
  "createdAt",
  "updatedAt",
];

function getUserPayload(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

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
    if (isActive === "true" || isActive === "false")
      where.isActive = isActive === "true";

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
    const username =
      typeof req.body.username === "string"
        ? req.body.username.trim().toLowerCase()
        : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";
    const role =
      req.body.role === "staff"
        ? "staff"
        : req.body.role === "admin"
          ? "admin"
          : "";

    if (!name || !email || !username || !password || !role) {
      return res
        .status(400)
        .json({
          message: "Nama, username, email, password, dan role wajib diisi",
        });
    }
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return res
        .status(400)
        .json({
          message:
            "Username harus 3-30 karakter: huruf kecil, angka, atau garis bawah",
        });
    }

    const policyError = validatePassword(password, await getPolicyRow());
    if (policyError) return res.status(400).json({ message: policyError });

    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res.status(409).json({ message: "Email sudah terdaftar" });
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername)
      return res.status(409).json({ message: "Username sudah digunakan" });

    const user = await User.create({
      name,
      username,
      email,
      role,
      password: await bcrypt.hash(password, 10),
      isActive: true,
    });

    return res
      .status(201)
      .json({
        message: "Pengguna berhasil dibuat",
        data: await User.findByPk(user.id, { attributes: publicAttributes }),
      });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ message: "Gagal membuat pengguna" });
  }
}

async function update(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });

    const { name, email } = getUserPayload(req.body);
    const username =
      typeof req.body.username === "string"
        ? req.body.username.trim().toLowerCase()
        : user.username;
    const role =
      req.body.role === "staff" || req.body.role === "admin"
        ? req.body.role
        : user.role;
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !email || !username)
      return res
        .status(400)
        .json({ message: "Nama, username, dan email wajib diisi" });
    if (!/^[a-z0-9_]{3,30}$/.test(username))
      return res
        .status(400)
        .json({
          message:
            "Username harus 3-30 karakter: huruf kecil, angka, atau garis bawah",
        });

    const duplicate = await User.findOne({
      where: { email, id: { [Op.ne]: user.id } },
    });
    if (duplicate)
      return res.status(409).json({ message: "Email sudah terdaftar" });
    const usernameDuplicate = await User.findOne({
      where: { username, id: { [Op.ne]: user.id } },
    });
    if (usernameDuplicate)
      return res.status(409).json({ message: "Username sudah digunakan" });
    if (user.id === req.user.id && role !== user.role) {
      return res
        .status(400)
        .json({ message: "Role akun sendiri tidak dapat diubah" });
    }
    if (password) {
      const policyError = validatePassword(password, await getPolicyRow());
      if (policyError) return res.status(400).json({ message: policyError });
    }

    const updates = { name, username, email, role };
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
      updates.passwordChangedAt = new Date();
    }
    await user.update(updates);

    return res.json({
      message: "Pengguna berhasil diperbarui",
      data: await User.findByPk(user.id, { attributes: publicAttributes }),
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ message: "Gagal memperbarui pengguna" });
  }
}

async function updateStatus(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    if (user.id === req.user.id && req.body.isActive === false) {
      return res
        .status(400)
        .json({ message: "Anda tidak dapat menonaktifkan akun sendiri" });
    }

    const nextStatus = Boolean(req.body.isActive);
    if (!nextStatus && user.role === "admin") {
      const activeAdminCount = await User.count({
        where: { role: "admin", isActive: true },
      });
      if (activeAdminCount <= 1)
        return res
          .status(400)
          .json({ message: "Admin terakhir tidak dapat dinonaktifkan" });
    }

    await user.update({ isActive: nextStatus });
    return res.json({
      message: "Status pengguna berhasil diperbarui",
      data: await User.findByPk(user.id, { attributes: publicAttributes }),
    });
  } catch (error) {
    console.error("Update user status error:", error);
    return res
      .status(500)
      .json({ message: "Gagal memperbarui status pengguna" });
  }
}

async function getProfile(req, res) {
  const user = await User.findByPk(req.user.id, {
    attributes: publicAttributes,
  });
  return res.json(user);
}

async function updateProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    const { name, email } = getUserPayload(req.body);
    const username =
      typeof req.body.username === "string"
        ? req.body.username.trim().toLowerCase()
        : "";
    const phone =
      typeof req.body.phone === "string" ? req.body.phone.trim() : null;
    const bio = typeof req.body.bio === "string" ? req.body.bio.trim() : null;
    const avatarUrl =
      req.body.avatarUrl === null || typeof req.body.avatarUrl === "string"
        ? req.body.avatarUrl
        : undefined;
    if (!user || !name || !email)
      return res.status(400).json({ message: "Nama dan email wajib diisi" });
    if (!/^[a-z0-9_]{3,30}$/.test(username))
      return res
        .status(400)
        .json({
          message:
            "Username harus 3-30 karakter: huruf kecil, angka, atau garis bawah",
        });
    if (phone && !/^[0-9+() -]{8,30}$/.test(phone))
      return res.status(400).json({ message: "Nomor HP tidak valid" });
    if (bio && bio.length > 500)
      return res.status(400).json({ message: "Bio maksimal 500 karakter" });
    if (
      avatarUrl !== undefined &&
      avatarUrl !== null &&
      (!/^data:image\/(jpeg|png|webp);base64,/.test(avatarUrl) ||
        Buffer.byteLength(avatarUrl, "utf8") > 5 * 1024 * 1024)
    )
      return res
        .status(400)
        .json({
          message: "Foto profil harus JPG, PNG, atau WebP dan maksimal 5MB",
        });

    const duplicate = await User.findOne({
      where: { email, id: { [Op.ne]: user.id } },
    });
    if (duplicate)
      return res.status(409).json({ message: "Email sudah terdaftar" });
    const usernameDuplicate = await User.findOne({
      where: { username, id: { [Op.ne]: user.id } },
    });
    if (usernameDuplicate)
      return res.status(409).json({ message: "Username sudah digunakan" });

    await user.update({
      name,
      email,
      username,
      phone,
      bio,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    });
    return res.json({
      message: "Profil berhasil diperbarui",
      data: await User.findByPk(user.id, { attributes: publicAttributes }),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Gagal memperbarui profil" });
  }
}

async function checkUsername(req, res) {
  const username =
    typeof req.query.username === "string"
      ? req.query.username.trim().toLowerCase()
      : "";
  if (!/^[a-z0-9_]{3,30}$/.test(username))
    return res.json({
      available: false,
      message: "Format username tidak valid",
    });
  const user = await User.findOne({
    where: { username, id: { [Op.ne]: req.user.id } },
    attributes: ["id"],
  });
  return res.json({ available: !user });
}

async function changePassword(req, res) {
  const user = await User.findByPk(req.user.id);
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (
    !user ||
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    newPassword !== confirmPassword
  )
    return res.status(400).json({ message: "Data password tidak valid" });
  const policyError = validatePassword(newPassword, await getPolicyRow());
  if (policyError) return res.status(400).json({ message: policyError });
  if (!(await bcrypt.compare(currentPassword, user.password)))
    return res.status(400).json({ message: "Password lama salah" });
  await user.update({
    password: await bcrypt.hash(newPassword, 10),
    passwordChangedAt: new Date(),
  });
  const endedAt = new Date();
  await Session.update(
    { revokedAt: endedAt, status: "revoked", endedAt },
    { where: { userId: user.id, revokedAt: null, status: "active" } },
  );
  return res.json({
    message: "Password berhasil diubah. Silakan login kembali.",
  });
}

async function getSessions(req, res) {
  const user = await User.findByPk(req.user.id, {
    attributes: ["id", "name", "username", "email", "avatarUrl"],
  });
  const sessions = await Session.findAll({
    where: { userId: req.user.id, revokedAt: null, status: "active" },
    attributes: [
      "id",
      "jti",
      "deviceName",
      "browser",
      "operatingSystem",
      "ipAddress",
      "createdAt",
      "lastActivityAt",
      "expiresAt",
      "status",
    ],
    order: [["createdAt", "DESC"]],
  });
  return res.json({
    user,
    sessions: sessions.map((session) => ({
      ...session.toJSON(),
      isCurrent: session.jti === req.auth.jti,
    })),
  });
}

async function revokeSession(req, res) {
  const endedAt = new Date();
  await Session.update(
    { revokedAt: endedAt, status: "revoked", endedAt },
    { where: { id: req.params.id, userId: req.user.id, status: "active" } },
  );
  return res.json({ message: "Sesi berhasil dikeluarkan" });
}

async function revokeAllSessions(req, res) {
  const endedAt = new Date();
  await Session.update(
    { revokedAt: endedAt, status: "revoked", endedAt },
    {
      where: {
        userId: req.user.id,
        revokedAt: null,
        status: "active",
        jti: { [Op.ne]: req.auth.jti },
      },
    },
  );
  return res.json({
    message: "Semua sesi perangkat lain berhasil dikeluarkan",
  });
}

async function getSessionHistory(req, res) {
  const sessions = await Session.findAll({
    where: {
      userId: req.user.id,
      [Op.or]: [
        { status: { [Op.ne]: "active" } },
        { revokedAt: { [Op.ne]: null } },
      ],
    },
    attributes: [
      "id",
      "deviceName",
      "browser",
      "operatingSystem",
      "ipAddress",
      "createdAt",
      "lastActivityAt",
      "endedAt",
      "status",
    ],
    order: [
      ["endedAt", "DESC"],
      ["createdAt", "DESC"],
    ],
  });
  return res.json(sessions);
}

async function logoutCurrent(req, res) {
  const endedAt = new Date();
  await Session.update(
    { revokedAt: endedAt, status: "revoked", endedAt },
    { where: { jti: req.auth.jti, userId: req.user.id, status: "active" } },
  );
  return res.json({ message: "Logout berhasil" });
}

async function deleteAccount(req, res) {
  const user = await User.findByPk(req.user.id);
  if (
    !user ||
    typeof req.body.username !== "string" ||
    req.body.username.trim().toLowerCase() !== user.username
  )
    return res
      .status(400)
      .json({ message: "Konfirmasi username tidak sesuai" });
  if (
    typeof req.body.password !== "string" ||
    !(await bcrypt.compare(req.body.password, user.password))
  )
    return res.status(401).json({ message: "Autentikasi ulang gagal" });
  if (
    user.role === "admin" &&
    (await User.count({ where: { role: "admin", isActive: true } })) <= 1
  )
    return res
      .status(400)
      .json({
        message:
          "Akun merupakan satu-satunya admin aktif dan tidak dapat dihapus",
      });
  await user.destroy();
  return res.json({ message: "Akun berhasil dihapus" });
}

module.exports = {
  getAll,
  create,
  update,
  updateStatus,
  getProfile,
  updateProfile,
  checkUsername,
  changePassword,
  getSessions,
  getSessionHistory,
  revokeSession,
  revokeAllSessions,
  logoutCurrent,
  deleteAccount,
};
