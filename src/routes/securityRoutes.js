const express = require("express");
const requireRole = require("../middleware/roleMiddleware");
const controller = require("../controllers/securityController");

const router = express.Router();
router.get("/settings", controller.getSettings);
router.put("/settings", controller.updateSettings);
router.get("/policy", controller.getPolicy);
router.put("/policy", requireRole("admin"), controller.updatePolicy);
router.post("/2fa/setup", controller.setup2fa);
router.post("/2fa/verify-enable", controller.verifyEnable2fa);
router.post("/2fa/disable", controller.disable2fa);
router.post("/2fa/recovery-codes/regenerate", controller.regenerateRecoveryCodes);
router.get("/login-history", controller.loginHistory);
module.exports = router;
