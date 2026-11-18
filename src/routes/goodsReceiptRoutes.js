const express = require("express");
const requireRole = require("../middleware/roleMiddleware");

const {
  getAll,
  getNextNumber,
  create,
} = require("../controllers/goodsReceiptController");

const router = express.Router();

router.get("/", getAll);
router.get("/next-number", getNextNumber);
router.post("/", requireRole("admin", "staff"), create);

module.exports = router;