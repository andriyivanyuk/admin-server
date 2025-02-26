const pool = require("../../../config/db");

class CategoriesController {
  async addCategory(req, res) {
    const { title, description } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO categories (title, description) VALUES ($1, $2) RETURNING *",
        [title, description]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error creating category: " + error.message });
    }
  }

  async getCategories(req, res) {
    try {
      const result = await pool.query("SELECT * FROM categories");
      res.status(200).json(result.rows);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error retrieving categories: " + error.message });
    }
  }

  async getCategoryById(req, res) {
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
      res
        .status(500)
        .json({ message: "Error retrieving category: " + error.message });
    }
  }

  async updateCategory(req, res) {
    const { id } = req.params;
    const { title, description } = req.body;
    try {
      const result = await pool.query(
        "UPDATE categories SET title = $1, description = $2 WHERE category_id = $3 RETURNING *",
        [title, description, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.status(200).json(result.rows[0]);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error updating category: " + error.message });
    }
  }

  async deleteCategory(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "DELETE FROM categories WHERE category_id = $1 RETURNING *",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting category: " + error.message });
    }
  }
}

module.exports = new CategoriesController();
