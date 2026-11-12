const { getDashboardStats } = require("../services/dashboardService");

async function getDashboard(req, res) {
  try {
    return res.json(await getDashboardStats());
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({
      message: "Gagal mengambil data dashboard",
    });
  }
}

module.exports = {
  getDashboard,
};
