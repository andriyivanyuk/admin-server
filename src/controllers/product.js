const pool = require("../../config/db");

class ProductsController {
  async addProduct(req, res) {
    const {
      title,
      description,
      price,
      stock,
      category_id,
      status_id,
      attributes,
    } = req.body;
    const created_by_user_id = req.user?.id;
    const imagePath = req.file ? `images/${req.file.filename}` : null;

    if (!created_by_user_id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User ID not found" });
    }

    try {
      await pool.query("BEGIN");
      const productResult = await pool.query(
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

      const productId = productResult.rows[0].product_id;
      for (const attr of attributes) {
        await pool.query(
          "INSERT INTO product_attributes (product_id, attribute_key, attribute_value) VALUES ($1, $2, $3)",
          [productId, attr.key, attr.value]
        );
      }

      await pool.query("COMMIT");
      res.status(201).json(productResult.rows[0]);
    } catch (error) {
      await pool.query("ROLLBACK");
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async getProducts(req, res) {
    try {
      const result = await pool.query(
        "SELECT p.*, s.status_name, json_agg(json_build_object('key', pa.attribute_key, 'value', pa.attribute_value)) AS attributes FROM products p JOIN statuses s ON p.status_id = s.status_id LEFT JOIN product_attributes pa ON p.product_id = pa.product_id GROUP BY p.product_id, s.status_name"
      );
      res.json(result.rows);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async getProductById(req, res) {
    const { id } = req.params;
    try {
      const product = await pool.query(
        "SELECT p.*, s.status_name FROM products p JOIN statuses s ON p.status_id = s.status_id WHERE p.product_id = $1",
        [id]
      );

      if (product.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      const attributes = await pool.query(
        "SELECT attribute_key, attribute_value FROM product_attributes WHERE product_id = $1",
        [id]
      );

      res.json({
        ...product.rows[0],
        attributes: attributes.rows,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async updateProduct(req, res) {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      stock,
      category_id,
      status_id,
      attributes,
    } = req.body;
    const imagePath = req.file ? `images/${req.file.filename}` : null;

    try {
      await pool.query("BEGIN");
      const updatedProductResult = await pool.query(
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

      await pool.query("DELETE FROM product_attributes WHERE product_id = $1", [
        id,
      ]);
      for (const attr of attributes) {
        await pool.query(
          "INSERT INTO product_attributes (product_id, attribute_key, attribute_value) VALUES ($1, $2, $3)",
          [id, attr.key, attr.value]
        );
      }

      await pool.query("COMMIT");
      res.json(updatedProductResult.rows[0]);
    } catch (error) {
      await pool.query("ROLLBACK");
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async deleteProduct(req, res) {
    const { id } = req.params;
    try {
      await pool.query("BEGIN");
      await pool.query("DELETE FROM product_attributes WHERE product_id = $1", [
        id,
      ]);
      const deletedProductResult = await pool.query(
        "DELETE FROM products WHERE product_id = $1 RETURNING *",
        [id]
      );

      await pool.query("COMMIT");
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      await pool.query("ROLLBACK");
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
}

module.exports = new ProductsController();
