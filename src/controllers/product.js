const pool = require("../../config/db");

class ProductsController {
  async addProduct(req, res) {
    const { title, description, price, category, stock } = req.body;
    const imagePath = `images/${req.file.filename}`;
    try {
      const result = await pool.query(
        "INSERT INTO products (title, description, image_path, price, category, stock, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [title, description, imagePath, price, category, stock, req.user.userId]
      );
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getProducts(req, res) {
    try {
      const result = await pool.query("SELECT * FROM products");
      res.json(result.rows);
    } catch (error) {
      console.error("Error retrieving users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getProductById(req, res) {
    const { id } = req.params;
    try {
      const product = await pool.query("SELECT * FROM products WHERE id = $1", [
        id,
      ]);
      if (product.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product.rows[0]);
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  }

  async updateProduct(req, res) {
    const { id } = req.params;
    const { title, description, price, category, stock } = req.body;
    const imagePath = req.file ? `images/${req.file.filename}` : null;

    try {
      const updatedProduct = await pool.query(
        "UPDATE products SET title = $1, description = $2, price = $3, category = $4, stock = $5, image_path = COALESCE($6, image_path) WHERE id = $7 RETURNING *",
        [title, description, price, category, stock, imagePath, id]
      );
      if (updatedProduct.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(updatedProduct.rows[0]);
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  }

  async deleteProduct(req, res) {
    const { id } = req.params;
    try {
      const deletedProduct = await pool.query(
        "DELETE FROM products WHERE id = $1 RETURNING *",
        [id]
      );
      if (deletedProduct.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  }
}

module.exports = new ProductsController();
