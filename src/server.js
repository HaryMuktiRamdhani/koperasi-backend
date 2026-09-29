const express = require("express");
const sequelize = require("./config/database");

const app = express();
const PORT = process.env.PORT || 5001;

app.get("/api/health", (req, res) => {
  res.json({
    message: "API is running",
  });
});

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