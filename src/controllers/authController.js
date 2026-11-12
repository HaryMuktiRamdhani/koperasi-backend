const { login: authenticateUser } = require("../services/authService");
const ServiceError = require("../services/ServiceError");

async function login(req, res) {
  try {
    const result = await authenticateUser({
      email: req.body.email,
      password: req.body.password,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    if (result.requires2fa) {
      return res.json({
        message: "Verifikasi 2FA diperlukan",
        requires2fa: true,
        pendingToken: result.pendingToken,
      });
    }

    return res.json({
      message: "Login berhasil",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }
}

module.exports = {
  login,
};
