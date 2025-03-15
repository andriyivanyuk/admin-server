const express = require("express");
const router = express.Router();
const registrationCodeController = require("../../controllers/admin/registrationCodeController");
const requireSuperadmin = require("../../middlewares/requireSuperadmin");
const authenticate = require("../../middlewares/authenticate");

router.get(
  "/registration-codes",
  authenticate,
  requireSuperadmin,
  registrationCodeController.listCodes
);

router.post(
  "/registration-codes/generate",
  authenticate,
  requireSuperadmin,
  registrationCodeController.generateCode
);

router.delete(
  "/registration-codes/:code",
  authenticate,
  requireSuperadmin,
  registrationCodeController.deleteCode
);

module.exports = router;
