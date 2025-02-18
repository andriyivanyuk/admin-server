const pool = require("../../config/db");

class ProductsController {
  async getProducts(req, res) {
    try {
      const result = await pool.query(
        `SELECT p.*, s.status_name, json_agg(json_build_object('key', pa.attribute_key, 'value', pa.attribute_value)) FILTER (WHERE pa.attribute_id IS NOT NULL) AS attributes,
        json_agg(json_build_object('image_path', pi.image_path, 'is_primary', pi.is_primary)) FILTER (WHERE pi.image_id IS NOT NULL) AS images
        FROM products p
        JOIN statuses s ON p.status_id = s.status_id
        LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
        LEFT JOIN product_images pi ON p.product_id = pi.product_id
        GROUP BY p.product_id, s.status_name`
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
        `SELECT p.*, s.status_name, c.title as category_title,
        json_agg(json_build_object('key', pa.attribute_key, 'value', pa.attribute_value)) FILTER (WHERE pa.attribute_id IS NOT NULL) AS attributes,
        json_agg(json_build_object('image_path', pi.image_path, 'is_primary', pi.is_primary)) FILTER (WHERE pi.image_id IS NOT NULL) AS images
        FROM products p
        JOIN statuses s ON p.status_id = s.status_id
        JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
        LEFT JOIN product_images pi ON p.product_id = pi.product_id
        WHERE p.product_id = $1
        GROUP BY p.product_id, s.status_name, c.title`,
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
    const images = req.files;
    const primaryImageIndex = req.body.primary;

    try {
      await pool.query("BEGIN");

      const productResult = await pool.query(
        `INSERT INTO products (title, description, price, stock, category_id, created_by_user_id, status_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING product_id`,
        [title, description, price, stock, category_id, req.user.id, status_id]
      );
      const productId = productResult.rows[0].product_id;

      if (attributes && attributes.length > 0) {
        for (const attr of attributes) {
          await pool.query(
            `INSERT INTO product_attributes (product_id, attribute_key, attribute_value)
                     VALUES ($1, $2, $3)`,
            [productId, attr.key, attr.value]
          );
        }
      }

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const isPrimary = i.toString() === primaryImageIndex; // Перевіряємо, чи це основне фото
          await pool.query(
            `INSERT INTO product_images (product_id, image_path, is_primary)
                     VALUES ($1, $2, $3)`,
            [productId, images[i].path, isPrimary]
          );
        }
      }

      await pool.query("COMMIT");
      res.status(201).json({
        message: "Продукт створено успішно",
        productId: productId,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error inserting product:", error);
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
    const images = req.files;
    const primaryImageIndex = req.body.primary;

    try {
      await pool.query("BEGIN");

      const updatedProductResult = await pool.query(
        `UPDATE products SET title = $1, description = $2, price = $3, stock = $4, category_id = $5, status_id = $6 WHERE product_id = $7 RETURNING *`,
        [title, description, price, stock, category_id, status_id, id]
      );

      await pool.query("DELETE FROM product_attributes WHERE product_id = $1", [
        id,
      ]);

      if (attributes && attributes.length > 0) {
        for (const attr of attributes) {
          await pool.query(
            `INSERT INTO product_attributes (product_id, attribute_key, attribute_value)
             VALUES ($1, $2, $3)`,
            [id, attr.key, attr.value]
          );
        }
      }

      await pool.query("DELETE FROM product_images WHERE product_id = $1", [
        id,
      ]);

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const isPrimary = i.toString() === primaryImageIndex;
          await pool.query(
            `INSERT INTO product_images (product_id, image_path, is_primary)
             VALUES ($1, $2, $3)`,
            [id, images[i].path, isPrimary]
          );
        }
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
      await pool.query("DELETE FROM product_images WHERE product_id = $1", [
        id,
      ]);
      await pool.query("DELETE FROM product_attributes WHERE product_id = $1", [
        id,
      ]);
      const deletedProductResult = await pool.query(
        "DELETE FROM products WHERE product_id = $1 RETURNING *",
        [id]
      );

      await pool.query("COMMIT");
      res.json({ message: "Продукт видалено успішно" });
    } catch (error) {
      await pool.query("ROLLBACK");
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
}

module.exports = new ProductsController();
