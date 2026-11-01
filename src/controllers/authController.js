const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { Session } = require("../../models");
const crypto = require("crypto");

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
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Akun Anda sedang dinonaktifkan",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    const jti = crypto.randomUUID();
    const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
    const expiresAt = new Date(Date.now() + (expiresIn.endsWith("d") ? Number(expiresIn.slice(0, -1)) * 86400000 : 86400000));
    await Session.create({ userId: user.id, jti, userAgent: req.get("user-agent"), ipAddress: req.ip, expiresAt });
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