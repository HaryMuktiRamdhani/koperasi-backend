const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { Session } = require("../../models");
const crypto = require("crypto");
const { LoginHistory } = require("../../models");
const { getPolicyRow } = require("./securityController");
const { deviceLabel } = require("../utils/securityUtils");

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || typeof password !== "string" || !password) {
      return res.status(400).json({
        message: "Email dan password wajib diisi",
      });
    }

    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await LoginHistory.create({ identifierAttempted: normalizedEmail, ip: req.ip, userAgent: req.get("user-agent"), deviceLabel: deviceLabel(req.get("user-agent")).device, status: "failed" });
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Akun Anda sedang dinonaktifkan",
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await LoginHistory.create({ userId: user.id, identifierAttempted: normalizedEmail, ip: req.ip, userAgent: req.get("user-agent"), deviceLabel: deviceLabel(req.get("user-agent")).device, status: "locked" });
      return res.status(423).json({ message: `Akun terkunci. Coba lagi setelah ${user.lockedUntil.toLocaleString("id-ID")}.` });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const policy = await getPolicyRow();
      const nextCount = user.failedLoginCount + 1;
      const lockedUntil = nextCount >= policy.maxFailedAttempts ? new Date(Date.now() + policy.lockoutMinutes * 60000) : null;
      await user.update({ failedLoginCount: nextCount, lockedUntil });
      await LoginHistory.create({ userId: user.id, identifierAttempted: normalizedEmail, ip: req.ip, userAgent: req.get("user-agent"), deviceLabel: deviceLabel(req.get("user-agent")).device, status: lockedUntil ? "locked" : "failed" });
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    if (user.lockedUntil) await user.update({ lockedUntil: null, failedLoginCount: 0 });
    if (user.totpEnabled) {
      const pendingToken = jwt.sign({ id: user.id, scope: "2fa_pending" }, process.env.JWT_SECRET, { expiresIn: "5m" });
      return res.json({ message: "Verifikasi 2FA diperlukan", requires2fa: true, pendingToken });
    }

    await user.update({ failedLoginCount: 0, lockedUntil: null });
    const jti = crypto.randomUUID();
    const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
    const expiresAt = new Date(Date.now() + (expiresIn.endsWith("d") ? Number(expiresIn.slice(0, -1)) * 86400000 : 86400000));
    const device = deviceLabel(req.get("user-agent"));
    const session = await Session.create({ userId: user.id, jti, userAgent: req.get("user-agent"), ipAddress: req.ip, expiresAt, lastActivityAt: new Date(), deviceName: device.device, browser: device.browser, operatingSystem: device.os });
    await LoginHistory.create({ userId: user.id, sessionId: session.id, identifierAttempted: normalizedEmail, ip: req.ip, userAgent: req.get("user-agent"), deviceLabel: device.device, status: "success" });
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        isActive: user.isActive,
        jti,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
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
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }
}

module.exports = {
  login,
};