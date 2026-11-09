const jwt = require("jsonwebtoken");
const { User, Session, UserSecuritySettings } = require("../../models");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Token tidak ditemukan",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.scope === "2fa_pending") {
      if (!req.path.endsWith("/2fa/verify")) return res.status(401).json({ code: "2FA_REQUIRED", message: "Verifikasi 2FA diperlukan" });
      req.auth = decoded;
      return next();
    }

    const session = decoded.jti ? await Session.findOne({ where: { jti: decoded.jti, userId: decoded.id, revokedAt: null, status: "active" } }) : null;
    if (decoded.jti && (!session || session.expiresAt <= new Date())) {
      return res.status(401).json({ message: "Sesi sudah tidak aktif" });
    }
    if (!session) return res.status(401).json({ message: "Sesi sudah tidak aktif" });
    const [securitySettings] = await UserSecuritySettings.findOrCreate({ where: { userId: decoded.id }, defaults: { sessionTimeoutMinutes: 60 } });
    const lastActivity = session.lastActivityAt || session.createdAt;
    if (Date.now() - new Date(lastActivity).getTime() > securitySettings.sessionTimeoutMinutes * 60000) {
      await session.update({ revokedAt: new Date(), status: "expired", endedAt: new Date() });
      return res.status(401).json({ code: "SESSION_EXPIRED", message: "Sesi telah berakhir karena tidak aktif" });
    }
    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "name", "email", "role", "isActive", "username", "phone", "bio", "avatarUrl"],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "Akun tidak ditemukan atau dinonaktifkan",
      });
    }

    req.user = user.toJSON();
    req.auth = decoded;
    if (Date.now() - new Date(lastActivity).getTime() > 30000) await session.update({ lastActivityAt: new Date() });

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token tidak valid atau sudah expired",
    });
  }
}

module.exports = authenticateToken;