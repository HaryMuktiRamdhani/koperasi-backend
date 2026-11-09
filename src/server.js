const express = require("express");
const sequelize = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const jurusanRoutes = require("./routes/jurusanRoutes");
const classRoutes = require("./routes/classRoutes");
const studentRoutes = require("./routes/studentRoutes");
const itemRoutes = require("./routes/itemRoutes");
const billRoutes = require("./routes/billRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");
const searchRoutes = require("./routes/searchRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const cooperativeRoutes = require("./routes/cooperativeRoutes");
const securityRoutes = require("./routes/securityRoutes");
const userController = require("./controllers/userController");
const { keepAlive, verifyLogin2fa } = require("./controllers/securityController");
const cors = require("cors");
const path = require("path");

const authenticateToken = require("./middleware/authMiddleware");
const requireRole = require("./middleware/roleMiddleware");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5001;

app.use(express.json({ limit: "4mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/api/health", (req, res) => {
  res.json({
    message: "API is running",
  });
});

app.use("/api/auth", authRoutes);
app.post("/api/auth/logout", authenticateToken, userController.logoutCurrent);
app.post("/api/auth/2fa/verify", authenticateToken, verifyLogin2fa);
app.post("/api/auth/session/keep-alive", authenticateToken, keepAlive);


app.use("/api/dashboard", authenticateToken, dashboardRoutes);
app.use("/api/search", authenticateToken, searchRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);
app.use("/api/cooperative-profile", authenticateToken, cooperativeRoutes);
app.use("/api/security", authenticateToken, securityRoutes);
app.use("/api/users", authenticateToken, requireRole("admin"), userRoutes);
app.get("/api/profile", authenticateToken, userController.getProfile);
app.patch("/api/profile", authenticateToken, userController.updateProfile);
app.get("/api/profile/check-username", authenticateToken, userController.checkUsername);
app.patch("/api/profile/password", authenticateToken, userController.changePassword);
app.get("/api/profile/sessions", authenticateToken, userController.getSessions);
app.get("/api/profile/sessions/history", authenticateToken, userController.getSessionHistory);
app.delete("/api/profile/sessions/:id", authenticateToken, userController.revokeSession);
app.delete("/api/profile/sessions", authenticateToken, userController.revokeAllSessions);
app.delete("/api/profile", authenticateToken, userController.deleteAccount);
app.use("/api/jurusan", authenticateToken, requireRole("admin"), jurusanRoutes);
app.use("/api/classes", authenticateToken, requireRole("admin"), classRoutes);
app.use("/api/students", authenticateToken, requireRole("admin"), studentRoutes);
app.use("/api/items", authenticateToken, requireRole("admin"), itemRoutes);
app.use("/api/bills", authenticateToken, billRoutes);
app.use("/api/payments", authenticateToken, paymentRoutes);

async function startServer() {
  try {
    await sequelize.authenticate();

    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
}

startServer();