const express = require("express");
const requireRole = require("../middleware/roleMiddleware");

const { getAll, create } = require("../controllers/stockOpnameController");

const router = express.Router();

router.get("/", getAll);
router.post("/", requireRole("admin"), create);

module.exports = router;