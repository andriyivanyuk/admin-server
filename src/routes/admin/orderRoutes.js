const express = require("express");
const router = express.Router();
const orderAdminController = require("../../controllers/admin/order");
const authenticate = require("../../middlewares/authenticate");

router.get("/orders", authenticate, orderAdminController.getOrders);
router.get(
  "/order/:orderId",
  authenticate,
  orderAdminController.getOrderDetails
);

router.put(
  "/order/:orderId/status",
  authenticate,
  orderAdminController.updateOrderStatus
);

module.exports = router;
