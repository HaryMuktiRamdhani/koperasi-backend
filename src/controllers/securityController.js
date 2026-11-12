const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  User,
  UserSecuritySettings,
  SystemSecuritySettings,
  RecoveryCode,
  LoginHistory,
  Session,
} = require("../../models");
const {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  verifyTotp,
  generateRecoveryCode,
  hashRecoveryCode,
  deviceLabel,
} = require("../utils/securityUtils");
const {
  defaultPolicy,
  validatePolicy,
  validatePassword,
} = require("../utils/passwordPolicy");

async function getPolicyRow() {
  let row = await SystemSecuritySettings.findOne();
  if (!row) row = await SystemSecuritySettings.create(defaultPolicy());
  return row;
}

async function getUserSettings(req) {
  const [row] = await UserSecuritySettings.findOrCreate({
    where: { userId: req.user.id },
    defaults: { sessionTimeoutMinutes: 60 },
  });
  return row;
}

async function getSettings(req, res) {
  const row = await getUserSettings(req);
  const user = await User.findByPk(req.user.id, {
    attributes: ["totpEnabled"],
  });
  return res.json({
    sessionTimeoutMinutes: row.sessionTimeoutMinutes,
    totpEnabled: user.totpEnabled,
  });
}

async function updateSettings(req, res) {
  const value = Number(req.body.sessionTimeoutMinutes);
  if (![15, 30, 60, 480].includes(value))
    return res.status(400).json({ message: "Durasi sesi tidak valid" });
  const row = await getUserSettings(req);
  await row.update({ sessionTimeoutMinutes: value });
  return res.json({
    message: "Keamanan sesi berhasil disimpan",
    sessionTimeoutMinutes: value,
  });
}

async function getPolicy(req, res) {
  const row = await getPolicyRow();
  return res.json(row);
}

async function updatePolicy(req, res) {
  const result = validatePolicy(req.body);
  if (typeof result === "string")
    return res.status(400).json({ message: result });
  const row = await getPolicyRow();
  await row.update(result);
  return res.json({
    message: "Kebijakan keamanan berhasil disimpan",
    data: row,
  });
}

async function setup2fa(req, res) {
  const user = await User.findByPk(req.user.id);
  const secret = generateTotpSecret();
  await user.update({
    totpSecretEnc: encryptSecret(secret),
    totpEnabled: false,
    totpConfirmedAt: null,
  });
  const issuer = encodeURIComponent("Stokpedia");
  const account = encodeURIComponent(user.email);
  return res.json({
    secret,
    otpauthUri: `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
  });
}

async function verifyEnable2fa(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user?.totpSecretEnc)
    return res.status(400).json({ message: "Setup 2FA belum dimulai" });
  if (!verifyTotp(decryptSecret(user.totpSecretEnc), req.body.code))
    return res.status(400).json({ message: "Kode autentikasi tidak valid" });
  const codes = Array.from({ length: 10 }, generateRecoveryCode);
  await RecoveryCode.destroy({ where: { userId: user.id } });
  await RecoveryCode.bulkCreate(
    codes.map((code) => ({
      userId: user.id,
      codeHash: hashRecoveryCode(code),
    })),
  );
  await user.update({ totpEnabled: true, totpConfirmedAt: new Date() });
  return res.json({ message: "2FA berhasil diaktifkan", recoveryCodes: codes });
}

async function disable2fa(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user?.totpEnabled || !user.totpSecretEnc)
    return res.status(400).json({ message: "2FA belum aktif" });
  if (
    typeof req.body.password !== "string" ||
    !(await bcrypt.compare(req.body.password, user.password)) ||
    !verifyTotp(decryptSecret(user.totpSecretEnc), req.body.code)
  ) {
    return res
      .status(400)
      .json({ message: "Password atau kode autentikasi tidak valid" });
  }
  await RecoveryCode.destroy({ where: { userId: user.id } });
  await user.update({
    totpEnabled: false,
    totpSecretEnc: null,
    totpConfirmedAt: null,
  });
  return res.json({ message: "2FA berhasil dinonaktifkan" });
}

async function regenerateRecoveryCodes(req, res) {
  const user = await User.findByPk(req.user.id);
  if (
    !user?.totpEnabled ||
    typeof req.body.password !== "string" ||
    !(await bcrypt.compare(req.body.password, user.password))
  )
    return res
      .status(400)
      .json({ message: "Password tidak valid atau 2FA belum aktif" });
  const codes = Array.from({ length: 10 }, generateRecoveryCode);
  await RecoveryCode.destroy({ where: { userId: user.id } });
  await RecoveryCode.bulkCreate(
    codes.map((code) => ({
      userId: user.id,
      codeHash: hashRecoveryCode(code),
    })),
  );
  return res.json({
    message: "Recovery code berhasil dibuat ulang",
    recoveryCodes: codes,
  });
}

async function loginHistory(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.page_size) || 20));
  const result = await LoginHistory.findAndCountAll({
    where: { userId: req.user.id },
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    attributes: ["id", "ip", "deviceLabel", "status", "createdAt"],
  });
  return res.json({ items: result.rows, total: result.count, page, pageSize });
}

async function keepAlive(req, res) {
  await Session.update(
    { lastActivityAt: new Date() },
    { where: { jti: req.auth.jti, userId: req.user.id, revokedAt: null } },
  );
  return res.json({ message: "Sesi diperpanjang" });
}

async function verifyLogin2fa(req, res) {
  const decoded = req.auth;
  const user = await User.findByPk(decoded.id);
  if (!user?.totpEnabled || decoded.scope !== "2fa_pending")
    return res.status(401).json({ message: "Token 2FA tidak valid" });
  let valid = false;
  if (
    typeof req.body.code === "string" &&
    /^\d{6}$/.test(req.body.code) &&
    user.totpSecretEnc
  )
    valid = verifyTotp(decryptSecret(user.totpSecretEnc), req.body.code);
  if (!valid && typeof req.body.recoveryCode === "string") {
    const recovery = await RecoveryCode.findOne({
      where: {
        userId: user.id,
        codeHash: hashRecoveryCode(req.body.recoveryCode),
        usedAt: null,
      },
    });
    if (recovery) {
      await recovery.update({ usedAt: new Date() });
      valid = true;
    }
  }
  const device = deviceLabel(req.get("user-agent"));
  if (!valid) {
    await LoginHistory.create({
      userId: user.id,
      identifierAttempted: user.email,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      deviceLabel: device.device,
      status: "2fa_failed",
    });
    return res.status(401).json({ message: "Kode autentikasi tidak valid" });
  }
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 86400000);
  await user.update({ failedLoginCount: 0, lockedUntil: null });
  const session = await Session.create({
    userId: user.id,
    jti,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
    expiresAt,
    lastActivityAt: new Date(),
    deviceName: device.device,
    browser: device.browser,
    operatingSystem: device.os,
  });
  await LoginHistory.create({
    userId: user.id,
    sessionId: session.id,
    identifierAttempted: user.email,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    deviceLabel: device.device,
    status: "success",
  });
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { id: user.id, role: user.role, isActive: user.isActive, jti },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
  return res.json({
    message: "Login berhasil",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      username: user.username,
      phone: user.phone,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    },
  });
}

module.exports = {
  getSettings,
  updateSettings,
  getPolicy,
  updatePolicy,
  setup2fa,
  verifyEnable2fa,
  disable2fa,
  regenerateRecoveryCodes,
  loginHistory,
  keepAlive,
  verifyLogin2fa,
  getPolicyRow,
  validatePassword,
};
