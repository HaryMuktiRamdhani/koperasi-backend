const express = require("express");
const requireRole = require("../middleware/roleMiddleware");

const {
  getEligible,
  preview,
  commit,
} = require("../controllers/promotionController");
const {
  getHistory,
  getHistoryDetail,
} = require("../controllers/promotionHistoryController");

const router = express.Router();

router.get("/eligible", requireRole("admin"), getEligible);
router.post("/preview", requireRole("admin"), preview);
router.post("/", requireRole("admin"), commit);
router.get("/history", requireRole("admin"), getHistory);
router.get("/history/:id", requireRole("admin"), getHistoryDetail);

module.exports = router;