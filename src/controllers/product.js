const pool = require("../../config/db");

class ProductsController {
  async addProduct(req, res) {
    const { title, description, price, category_id, stock, status_id } =
      req.body;
    const created_by_user_id = req.user?.id;
    const imagePath = req.file ? `images/${req.file.filename}` : null;

    if (!created_by_user_id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User ID not found" });
    }

    try {
      const result = await pool.query(
        "INSERT INTO products (title, description, image_path, price, stock, category_id, created_by_user_id, status_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        [
          title,
          description,
          imagePath,
          price,
          stock,
          category_id,
          created_by_user_id,
          status_id,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating product:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async getProducts(req, res) {
    try {
      const result = await pool.query(`
        SELECT p.*, s.status_name 
        FROM products p
        JOIN statuses s ON p.status_id = s.status_id
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error retrieving products:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async getProductById(req, res) {
    const { id } = req.params;
    try {
      const product = await pool.query(
        "SELECT p.*, s.status_name FROM products p JOIN statuses s ON p.status_id = s.status_id WHERE product_id = $1",
        [id]
      );

      if (product.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product.rows[0]);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async updateProduct(req, res) {
    const { id } = req.params;
    const { title, description, price, category_id, stock, status_id } =
      req.body;
    const imagePath = req.file ? `images/${req.file.filename}` : null;

    try {
      const updatedProduct = await pool.query(
        "UPDATE products SET title = $1, description = $2, price = $3, stock = $4, category_id = $5, image_path = COALESCE($6, image_path), status_id = $7 WHERE product_id = $8 RETURNING *",
        [
          title,
          description,
          price,
          stock,
          category_id,
          imagePath,
          status_id,
          id,
        ]
      );

      if (updatedProduct.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(updatedProduct.rows[0]);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async deleteProduct(req, res) {
    const { id } = req.params;
    try {
      const deletedProduct = await pool.query(
        "DELETE FROM products WHERE product_id = $1 RETURNING *",
        [id]
      );

      if (deletedProduct.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
}

module.exports = new ProductsController();
