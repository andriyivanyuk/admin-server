const express = require("express");
const imagesController = require("../controllers/imagesController");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const upload = require("../middlewares/upload");

router.post(
  "/upload",
  authenticate,
  upload.single(),
  imagesController.uploadImage
);
router.post(
  "/uploadMultiple",
  upload.array("images", 10),
  imagesController.uploadMultipleImages
);

router.get("/upload/:imageId", authenticate, imagesController.getImage);
router.get(
  "/product/:productId",
  authenticate,
  imagesController.getImagesByProduct
);
router.put("/update/:imageId", authenticate, imagesController.updateImage);
router.delete("/delete/:imageId", authenticate, imagesController.deleteImage);

module.exports = router;
