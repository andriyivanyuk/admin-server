const express = require("express");
const router = express.Router();
const adminStoreController = require("../../controllers/admin/adminStore");
const authenticate = require("../../middlewares/authenticate");

router.get("/storeId", authenticate, adminStoreController.getStoreId);

module.exports = router;
