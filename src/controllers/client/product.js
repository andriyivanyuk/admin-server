const pool = require("../../../config/db");

class ClientProductsController {
  async getProducts(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    try {
      const countQuery = `
      SELECT COUNT(*) AS total FROM products WHERE lower(title) LIKE lower($1)
    `;
      const countResult = await pool.query(countQuery, [`%${search}%`]);
      const totalProducts = parseInt(countResult.rows[0].total);

      // Вибираємо продукти з бази
      const productQuery = `
      SELECT p.*, s.status_name, json_agg(json_build_object('key', pa.attribute_key, 'value', pa.attribute_value)) FILTER (WHERE pa.attribute_id IS NOT NULL) AS attributes,
      json_agg(json_build_object('image_path', pi.image_path, 'is_primary', pi.is_primary)) FILTER (WHERE pi.image_id IS NOT NULL) AS images
      FROM products p
      JOIN statuses s ON p.status_id = s.status_id
      LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id
      WHERE lower(p.title) LIKE lower($1)
      GROUP BY p.product_id, s.status_name
      ORDER BY p.product_id
      LIMIT $2 OFFSET $3
    `;
      const result = await pool.query(productQuery, [
        `%${search}%`,
        limit,
        offset,
      ]);

      res.json({ products: result.rows, total: totalProducts, page, limit });
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
            (SELECT json_agg(json_build_object('key', pa.attribute_key, 'value', pa.attribute_value)) 
                FROM product_attributes pa WHERE pa.product_id = p.product_id) AS attributes,
            
            (SELECT json_agg(json_build_object('image_id', pi.image_id, 'image_path', pi.image_path, 'is_primary', pi.is_primary)) 
                FROM product_images pi WHERE pi.product_id = p.product_id) AS images
            
            FROM products p
            JOIN statuses s ON p.status_id = s.status_id
            JOIN categories c ON p.category_id = c.category_id
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
}

module.exports = new ClientProductsController();
