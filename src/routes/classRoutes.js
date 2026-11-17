const express = require("express");
const requireRole = require("../middleware/roleMiddleware");

const {
  getAll,
  create,
  update,
  remove,
} = require("../controllers/classController");

const router = express.Router();

router.get("/", getAll);
router.post("/", requireRole("admin"), create);
router.put("/:id", requireRole("admin"), update);
router.delete("/:id", requireRole("admin"), remove);

module.exports = router;