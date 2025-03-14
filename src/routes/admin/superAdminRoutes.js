const express = require("express");
const router = express.Router();
const registrationCodeController = require("../../controllers/admin/registrationCodeController");
const requireSuperadmin = require("../../middlewares/requireSuperadmin");
const authenticate = require("../../middlewares/authenticate");

router.post(
  "/registration-codes/generate",
  authenticate,
  requireSuperadmin,
  registrationCodeController.generateCode
);

router.get(
  "/registration-codes",
  authenticate,
  requireSuperadmin,
  registrationCodeController.listCodes
);

module.exports = router;
