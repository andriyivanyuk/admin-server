const express = require("express");
const orderClientController = require("../../controllers/client/order");

const router = express.Router();
router.post("/createOrder", orderClientController.createOrder);

module.exports = router;
