const pool = require("../../../config/db");
const path = require("path");
const fs = require("fs");

class CategoriesController {
  addCategory = async (req, res) => {
    const { title, description } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO categories (title, description) VALUES ($1, $2) RETURNING *",
        [title, description]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating category:", error);
      res
        .status(500)
        .json({ message: "Error creating category: " + error.message });
    }
  };

  async getCategories(req, res) {
    try {
      const result = await pool.query("SELECT * FROM categories");
      res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error retrieving categories:", error);
      res
        .status(500)
        .json({ message: "Error retrieving categories: " + error.message });
    }
  }

  getCategoryById = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "SELECT * FROM categories WHERE category_id = $1",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Error retrieving category:", error);
      res
        .status(500)
        .json({ message: "Error retrieving category: " + error.message });
    }
  };

  async updateCategory(req, res) {
    const { id } = req.params;
    const { title, description } = req.body;
    try {
      const check = await pool.query(
        "SELECT * FROM categories WHERE category_id = $1",
        [id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      const result = await pool.query(
        "UPDATE categories SET title = $1, description = $2 WHERE category_id = $3 RETURNING *",
        [title, description, id]
      );
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Error updating category:", error);
      res
        .status(500)
        .json({ message: "Error updating category: " + error.message });
    }
  }

  deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
      const check = await pool.query(
        "SELECT * FROM categories WHERE category_id = $1",
        [id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      const imagesResult = await pool.query(
        `
        SELECT pi.image_path
        FROM Product_Images pi
        JOIN Products p ON p.product_id = pi.product_id
        WHERE p.category_id = $1
        `,
        [id]
      );
      const imagePaths = imagesResult.rows.map((row) => row.image_path);

      const result = await pool.query(
        "DELETE FROM categories WHERE category_id = $1 RETURNING *",
        [id]
      );

      await Promise.all(
        imagePaths.map((imagePath) => {
          const filePath = path.join(__dirname, "..", "..", "..", imagePath);
          return fs.promises.unlink(filePath).catch((err) => {
            console.error(`Failed to delete image file ${filePath}:`, err);
          });
        })
      );

      res.status(200).json({
        message:
          "Категорію та пов’язані продукти та зображення успішно видалено",
        deletedCategory: result.rows[0],
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      res
        .status(500)
        .json({ message: "Error deleting category: " + error.message });
    }
  };
}

module.exports = new CategoriesController();
