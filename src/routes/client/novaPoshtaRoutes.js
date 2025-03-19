const express = require("express");
const novaPoshtaController = require("../../controllers/client/novaPoshtaApi");

const router = express.Router();
router.get("/getBranches", novaPoshtaController.getBranches);
router.get("/cities", novaPoshtaController.getCities);

module.exports = router;
