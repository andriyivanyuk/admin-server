const express = require("express");
const productsController = require("../controllers/product");
const authenticate = require("../middlewares/authenticate");
const upload = require("../middlewares/upload");

const router = express.Router();
router.get("/products", authenticate, productsController.getProducts);
router.post(
  "/product/add",
  authenticate,
  upload.array("images", 5),
  productsController.addProduct
);

router.get("/product/:id", authenticate, productsController.getProductById);
router.put(
  "/product/:id",
  authenticate,
  upload.array("images", 5),
  productsController.updateProduct
);
router.delete("/product/:id", authenticate, productsController.deleteProduct);

module.exports = router;
