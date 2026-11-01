const jwt = require("jsonwebtoken");
const { User, Session } = require("../../models");

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

    const session = decoded.jti ? await Session.findOne({ where: { jti: decoded.jti, userId: decoded.id, revokedAt: null } }) : null;
    if (decoded.jti && (!session || session.expiresAt <= new Date())) {
      return res.status(401).json({ message: "Sesi sudah tidak aktif" });
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

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token tidak valid atau sudah expired",
    });
  }
}

module.exports = authenticateToken;