const express = require("express");
const router = express.Router();
const categoriesController = require("../../controllers/admin/categories");
const authenticate = require("../../middlewares/authenticate");

router.post(
  "/category/add-category",
  authenticate,
  categoriesController.addCategory
);

router.get("/categories", authenticate, categoriesController.getCategories);

router.get("/category/:id", authenticate, categoriesController.getCategoryById);

router.put("/category/:id", authenticate, categoriesController.updateCategory);

router.delete(
  "/category/:id",
  authenticate,
  categoriesController.deleteCategory
);

module.exports = router;
