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
const cors = require("cors");

const authenticateToken = require("./middleware/authMiddleware");

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

app.get("/api/profile", authenticateToken, (req, res) => {
  res.json({
    message: "Data profile berhasil diakses",
    user: req.user,
  });
});

app.use("/api/dashboard", authenticateToken, dashboardRoutes);
app.use("/api/jurusan", authenticateToken, jurusanRoutes);
app.use("/api/classes", authenticateToken, classRoutes);
app.use("/api/students", authenticateToken, studentRoutes);
app.use("/api/items", authenticateToken, itemRoutes);
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