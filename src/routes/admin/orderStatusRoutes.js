const express = require("express");
const router = express.Router();
const orderStatusesController = require("../../controllers/admin/orderStatus");
const authenticate = require("../../middlewares/authenticate");

router.get("/orderStatuses", authenticate, orderStatusesController.getStatuses);

module.exports = router;
