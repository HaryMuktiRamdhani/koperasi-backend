const express = require("express");
const requireRole = require("../middleware/roleMiddleware");

const {
  getEligible,
  preview,
  commit,
} = require("../controllers/promotionController");

const router = express.Router();

router.get("/eligible", requireRole("admin"), getEligible);
router.post("/preview", requireRole("admin"), preview);
router.post("/", requireRole("admin"), commit);

module.exports = router;