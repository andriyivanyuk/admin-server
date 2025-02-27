const express = require("express");
const productsClientController = require("../../controllers/client/product");

const router = express.Router();
router.get("/products", productsClientController.getProducts);

router.get("/product/:id", productsClientController.getProductById);

module.exports = router;
