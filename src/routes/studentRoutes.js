const express = require("express");
const requireRole = require("../middleware/roleMiddleware");

const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require("../controllers/studentController");

const router = express.Router();

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", requireRole("admin", "staff"), create);
router.put("/:id", requireRole("admin", "staff"), update);
router.delete("/:id", requireRole("admin"), remove);

module.exports = router;
