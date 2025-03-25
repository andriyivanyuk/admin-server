const pool = require("../../../config/db");

class ClientProductsController {
  getProducts = async (req, res) => {
    const storeId = req.headers["x-store-id"];
    if (!storeId) {
      return res.status(400).json({ message: "Missing store id in headers" });
    }

    const storeResult = await pool.query(
      "SELECT user_id FROM Store WHERE store_id = $1",
      [storeId]
    );
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }
    const adminId = storeResult.rows[0].user_id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    try {
      const countQuery = `
        SELECT COUNT(*) AS total 
        FROM products 
        WHERE lower(title) LIKE lower($1)
          AND created_by_user_id = $2
      `;
      const countResult = await pool.query(countQuery, [
        `%${search}%`,
        adminId,
      ]);
      const totalProducts = parseInt(countResult.rows[0].total);

      const productQuery = `
        SELECT 
          p.product_id, 
          p.product_code, 
          p.title, 
          p.price, 
          p.stock, 
          p.product_type,        
          s.status_name AS status,
          p.created_by_user_id,
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'key', pa.attribute_key,
              'values', (
                SELECT jsonb_agg(av.value)
                FROM attribute_values av
                WHERE av.attribute_id = pa.attribute_id
              )
            )
          ) AS attributes,
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'image_path', pi.image_path,
              'is_primary', pi.is_primary
            )
          ) AS images
        FROM products p
        JOIN statuses s ON p.status_id = s.status_id
        LEFT JOIN product_attributes pa ON p.product_id = pa.product_id
        LEFT JOIN product_images pi ON p.product_id = pi.product_id
        WHERE lower(p.title) LIKE lower($1)
          AND p.created_by_user_id = $2
        GROUP BY p.product_id, s.status_name
        ORDER BY p.product_id
        LIMIT $3 OFFSET $4
      `;
      const result = await pool.query(productQuery, [
        `%${search}%`,
        adminId,
        limit,
        offset,
      ]);

      res.json({ products: result.rows, total: totalProducts, page, limit });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  };

  getProductById = async (req, res) => {
    const storeId = req.headers["x-store-id"];
    if (!storeId) {
      return res.status(400).json({ message: "Missing store id in headers" });
    }

    const storeResult = await pool.query(
      "SELECT user_id FROM Store WHERE store_id = $1",
      [storeId]
    );
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }
    const adminId = storeResult.rows[0].user_id;

    const { id } = req.params;
    try {
      const product = await pool.query(
        `SELECT 
          p.*, 
          s.status_name, 
          c.title as category_title,
          p.product_type,          
          (SELECT json_agg(json_build_object('key', pa.attribute_key, 'value', pa.attribute_value)) 
           FROM product_attributes pa WHERE pa.product_id = p.product_id) AS attributes,
          (SELECT json_agg(json_build_object('image_id', pi.image_id, 'image_path', pi.image_path, 'is_primary', pi.is_primary)) 
           FROM product_images pi WHERE pi.product_id = p.product_id) AS images
         FROM products p
         JOIN statuses s ON p.status_id = s.status_id
         JOIN categories c ON p.category_id = c.category_id
         WHERE p.product_id = $1
           AND p.created_by_user_id = $2
         GROUP BY p.product_id, s.status_name, c.title`,
        [id, adminId]
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
  };
}

module.exports = new ClientProductsController();
