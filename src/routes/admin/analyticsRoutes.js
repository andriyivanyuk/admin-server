const express = require("express");
const router = express.Router();
const analyticsController = require("../../controllers/admin/analytics");
const authenticate = require("../../middlewares/authenticate");

router.get(
  "/order/analytics",
  authenticate,
  analyticsController.getOrdersAnalytics
);

router.get(
  "/order/income",
  authenticate,
  analyticsController.getIncomeAnalytics
);

module.exports = router;
