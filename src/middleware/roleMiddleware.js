function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses untuk melakukan tindakan ini",
      });
    }

    next();
  };
}

module.exports = requireRole;
