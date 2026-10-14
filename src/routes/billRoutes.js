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
router.post("/", create);
router.post("/bulk", createBulk);
router.put("/:id", update);
router.delete("/:id", requireRole("admin"), remove);

module.exports = router;