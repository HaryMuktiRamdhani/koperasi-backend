const express = require("express");

const {
  getAll,
  create,
  update,
  remove,
} = require("../controllers/studentController");

const router = express.Router();

router.get("/", getAll);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;