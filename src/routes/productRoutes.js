const express = require("express");
const multer = require("multer");
const productsController = require("../controllers/product");
const authenticate = require("../middlewares/authenticate");
const upload = require("../middlewares/upload");

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "src/public/images"),
//   filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
// });
// const upload = multer({ storage });

const router = express.Router();
router.get("/", productsController.getProducts);
router.post(
  "/add",
  authenticate,
  upload.single("image"),
  productsController.addProduct
);

router.get("/:id", authenticate, productsController.getProductById);
router.put(
  "/:id",
  authenticate,
  upload.single("image"),
  productsController.updateProduct
);
router.delete("/:id", authenticate, productsController.deleteProduct);

module.exports = router;
