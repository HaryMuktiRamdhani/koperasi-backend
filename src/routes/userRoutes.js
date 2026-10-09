const express = require("express");
const controller = require("../controllers/userController");

const router = express.Router();

router.get("/profile", controller.getProfile);
router.patch("/profile", controller.updateProfile);
router.get("/", controller.getAll);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;
