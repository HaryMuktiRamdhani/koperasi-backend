const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../../models/User");
const { Session, LoginHistory } = require("../../models");
const { getPolicyRow } = require("../controllers/securityController");
const { deviceLabel } = require("../utils/securityUtils");
const ServiceError = require("./ServiceError");

async function login({ email, password, ip, userAgent }) {
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail || typeof password !== "string" || !password) {
    throw new ServiceError(400, "Email dan password wajib diisi");
  }

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    await LoginHistory.create({
      identifierAttempted: normalizedEmail,
      ip,
      userAgent,
      deviceLabel: deviceLabel(userAgent).device,
      status: "failed",
    });
    throw new ServiceError(401, "Email atau password salah");
  }

  if (!user.isActive) {
    throw new ServiceError(403, "Akun Anda sedang dinonaktifkan");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await LoginHistory.create({
      userId: user.id,
      identifierAttempted: normalizedEmail,
      ip,
      userAgent,
      deviceLabel: deviceLabel(userAgent).device,
      status: "locked",
    });
    throw new ServiceError(
      423,
      `Akun terkunci. Coba lagi setelah ${user.lockedUntil.toLocaleString("id-ID")}.`,
    );
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    const policy = await getPolicyRow();
    const nextCount = user.failedLoginCount + 1;
    const lockedUntil =
      nextCount >= policy.maxFailedAttempts
        ? new Date(Date.now() + policy.lockoutMinutes * 60000)
        : null;
    await user.update({ failedLoginCount: nextCount, lockedUntil });
    await LoginHistory.create({
      userId: user.id,
      identifierAttempted: normalizedEmail,
      ip,
      userAgent,
      deviceLabel: deviceLabel(userAgent).device,
      status: lockedUntil ? "locked" : "failed",
    });
    throw new ServiceError(401, "Email atau password salah");
  }

  if (user.lockedUntil)
    await user.update({ lockedUntil: null, failedLoginCount: 0 });
  if (user.totpEnabled) {
    return {
      requires2fa: true,
      pendingToken: jwt.sign(
        { id: user.id, scope: "2fa_pending" },
        process.env.JWT_SECRET,
        { expiresIn: "5m" },
      ),
    };
  }

  await user.update({ failedLoginCount: 0, lockedUntil: null });
  const jti = crypto.randomUUID();
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  const expiresAt = new Date(
    Date.now() +
      (expiresIn.endsWith("d")
        ? Number(expiresIn.slice(0, -1)) * 86400000
        : 86400000),
  );
  const device = deviceLabel(userAgent);
  const session = await Session.create({
    userId: user.id,
    jti,
    userAgent,
    ipAddress: ip,
    expiresAt,
    lastActivityAt: new Date(),
    deviceName: device.device,
    browser: device.browser,
    operatingSystem: device.os,
  });
  await LoginHistory.create({
    userId: user.id,
    sessionId: session.id,
    identifierAttempted: normalizedEmail,
    ip,
    userAgent,
    deviceLabel: device.device,
    status: "success",
  });

  return {
    token: jwt.sign(
      {
        id: user.id,
        role: user.role,
        isActive: user.isActive,
        jti,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    ),
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
  };
}

module.exports = { login };
