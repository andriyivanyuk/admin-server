const express = require("express");
const router = express.Router();
const productStatusesController = require("../../controllers/admin/productStatus");
const authenticate = require("../../middlewares/authenticate");

router.get(
  "/product/statuses",
  authenticate,
  productStatusesController.getStatuses
);

module.exports = router;
