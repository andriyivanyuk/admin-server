const express = require("express");
const productsAdminController = require("../../controllers/admin/product");
const authenticate = require("../../middlewares/authenticate");
const upload = require("../../middlewares/upload");

const router = express.Router();
router.get("/products", authenticate, productsAdminController.getProducts);
router.post(
  "/product/add",
  upload.array("images", 10),
  authenticate,
  productsAdminController.addProduct
);

router.get(
  "/product/:id",
  authenticate,
  productsAdminController.getProductById
);
router.put(
  "/product/:id",
  upload.array("images", 10),
  authenticate,
  productsAdminController.updateProduct
);
router.delete(
  "/product/:id",
  authenticate,
  productsAdminController.deleteProduct
);

module.exports = router;
