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
const userController = require("./controllers/userController");
const cors = require("cors");

const authenticateToken = require("./middleware/authMiddleware");
const requireRole = require("./middleware/roleMiddleware");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5001;

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    message: "API is running",
  });
});

app.use("/api/auth", authRoutes);


app.use("/api/dashboard", authenticateToken, dashboardRoutes);
app.use("/api/search", authenticateToken, searchRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);
app.use("/api/users", authenticateToken, requireRole("admin"), userRoutes);
app.get("/api/profile", authenticateToken, userController.getProfile);
app.patch("/api/profile", authenticateToken, userController.updateProfile);
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