const express = require("express");
const requireRole = require("../middleware/roleMiddleware");

const {
  getAll,
  create,
  createBulk,
  update,
  remove,
} = require("../controllers/billController");

const router = express.Router();

router.get("/", getAll);
router.post("/", requireRole("admin", "staff"), create);
router.post("/bulk", requireRole("admin", "staff"), createBulk);
router.put("/:id", requireRole("admin", "staff"), update);
router.delete("/:id", requireRole("admin"), remove);

module.exports = router;