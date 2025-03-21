const pool = require("../../../config/db");
const fs = require("fs");
const path = require("path");

const imageService = require("../../services/imageService");

class AdminProductsController {
  getProducts = async (req, res) => {
    const adminId = req.user && req.user.id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

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
         s.status_name AS status,
         pi.image_path
       FROM products p
       JOIN statuses s ON p.status_id = s.status_id
       LEFT JOIN product_images pi 
         ON p.product_id = pi.product_id AND pi.is_primary = true
       WHERE p.title ILIKE $1
         AND p.created_by_user_id = $2
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
    const adminId = req.user && req.user.id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    try {
      const productQuery = `
        WITH attribute_details AS (
            SELECT
                pa.product_id,
                pa.attribute_id,
                pa.attribute_key,
                json_agg(jsonb_build_object('value_id', av.value_id, 'value', av.value)) AS values
            FROM product_attributes pa
            LEFT JOIN attribute_values av ON pa.attribute_id = av.attribute_id
            WHERE pa.product_id = $1
            GROUP BY pa.product_id, pa.attribute_id, pa.attribute_key
        )
        SELECT 
            p.product_id, 
            p.title, 
            p.description, 
            p.price, 
            p.stock, 
            p.category_id, 
            p.status_id, 
            p.created_at, 
            p.updated_at, 
            s.status_name, 
            c.title as category_title,
            json_agg(DISTINCT jsonb_build_object('attribute_id', ad.attribute_id, 'key', ad.attribute_key, 'values', ad.values)) AS attributes,
            json_agg(DISTINCT jsonb_build_object('image_id', pi.image_id, 'image_path', pi.image_path, 'is_primary', pi.is_primary)) AS images
        FROM products p
        JOIN statuses s ON p.status_id = s.status_id
        JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN attribute_details ad ON p.product_id = ad.product_id
        LEFT JOIN product_images pi ON p.product_id = pi.product_id
        WHERE p.product_id = $1
          AND p.created_by_user_id = $2
        GROUP BY p.product_id, s.status_id, c.category_id;
      `;

      const product = await pool.query(productQuery, [id, adminId]);

      if (product.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      const result = product.rows[0];
      if (
        !result.attributes ||
        result.attributes.some(
          (attr) => attr.key === null || attr.values === null
        )
      ) {
        result.attributes = [];
      }

      res
        .status(200)
        .json({ message: "Product details received", product: result });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  };

  addProduct = async (req, res) => {
    const adminId = req.user && req.user.id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });
    const { title, description, price, stock, category_id, status_id } =
      req.body;
    const images = req.files;

    try {
      await pool.query("BEGIN");

      const uniqueCode = await this.generateUniqueProductCode();

      const productResult = await pool.query(
        `INSERT INTO products 
           (title, description, price, stock, category_id, created_by_user_id, status_id, product_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING product_id`,
        [
          title,
          description,
          price,
          stock,
          category_id,
          adminId,
          status_id,
          uniqueCode,
        ]
      );

      const productId = productResult.rows[0].product_id;

      if (req.body.attributes) {
        const attributes = JSON.parse(req.body.attributes);
        for (const attr of attributes) {
          const attributeResult = await pool.query(
            `INSERT INTO product_attributes (product_id, attribute_key)
               VALUES ($1, $2) RETURNING attribute_id`,
            [productId, attr.key]
          );
          const attributeId = attributeResult.rows[0].attribute_id;

          for (const value of attr.values) {
            await pool.query(
              `INSERT INTO attribute_values (attribute_id, value)
                 VALUES ($1, $2)`,
              [attributeId, value]
            );
          }
        }
      }

      const uploadedImages = await imageService.uploadImages(
        productId,
        images.map((img, index) => ({
          path: img.path,
          isPrimary: index.toString() === req.body.primary,
        }))
      );

      await pool.query("COMMIT");
      res.status(200).json({
        message: "Продукт створено успішно",
        productId: productId,
        productCode: uniqueCode,
        images: uploadedImages,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error inserting product:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  };

  updateProduct = async (req, res) => {
    const adminId = req.user && req.user.id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });
    const {
      product_id,
      title,
      description,
      price,
      stock,
      category_id,
      status_id,
      attributes,
      deleteImageIds,
      selectedImageId,
    } = req.body;
    const newImages = req.files;
    const selectedId = selectedImageId;

    try {
      await pool.query("BEGIN");

      const productCheck = await pool.query(
        "SELECT created_by_user_id FROM products WHERE product_id = $1",
        [product_id]
      );
      if (
        productCheck.rows.length === 0 ||
        productCheck.rows[0].created_by_user_id !== adminId
      ) {
        await pool.query("ROLLBACK");
        return res.status(403).json({ message: "Access denied" });
      }

      const deleteImgIds = JSON.parse(deleteImageIds);

      if (!!deleteImgIds.length) {
        await imageService.deleteImages(deleteImageIds);
      }

      await pool.query(
        `UPDATE products
         SET title = $1, description = $2, price = $3, stock = $4, category_id = $5, status_id = $6
         WHERE product_id = $7 AND created_by_user_id = $8`,
        [
          title,
          description,
          price,
          stock,
          category_id,
          status_id,
          product_id,
          adminId,
        ]
      );

      await pool.query(
        "UPDATE product_images SET is_primary = false WHERE product_id = $1",
        [product_id]
      );

      if (attributes) {
        const parsedAttributes = JSON.parse(attributes);
        if (parsedAttributes && parsedAttributes.length > 0) {
          await this.updateProductAttributes(product_id, parsedAttributes);
        }
      } else {
        await pool.query(
          "DELETE FROM attribute_values WHERE attribute_id IN (SELECT attribute_id FROM product_attributes WHERE product_id = $1)",
          [product_id]
        );
        await pool.query(
          "DELETE FROM product_attributes WHERE product_id = $1",
          [product_id]
        );
      }

      await pool.query("COMMIT");

      const defaultImages = await imageService.getImagesByProductId(product_id);
      if (defaultImages.length && !!selectedId) {
        await pool.query(
          "UPDATE product_images SET is_primary = true WHERE image_id = $1",
          [parseInt(selectedId)]
        );
      }
      if (newImages.length) {
        await imageService.uploadImages(
          product_id,
          newImages.map((img) => ({
            path: img.path,
            isPrimary: false,
          }))
        );
      }

      const updatedProductQuery = `
        WITH attribute_details AS (
            SELECT
                pa.product_id,
                pa.attribute_id,
                pa.attribute_key,
                json_agg(jsonb_build_object('value_id', av.value_id, 'value', av.value)) AS values
            FROM product_attributes pa
            LEFT JOIN attribute_values av ON pa.attribute_id = av.attribute_id
            WHERE pa.product_id = $1
            GROUP BY pa.product_id, pa.attribute_id, pa.attribute_key
        )
        SELECT 
            p.product_id, 
            p.title, 
            p.description, 
            p.price, 
            p.stock, 
            p.category_id, 
            p.status_id, 
            p.created_at, 
            p.updated_at, 
            s.status_name, 
            c.title as category_title,
            json_agg(DISTINCT jsonb_build_object('attribute_id', ad.attribute_id, 'key', ad.attribute_key, 'values', ad.values)) AS attributes,
            json_agg(DISTINCT jsonb_build_object('image_id', pi.image_id, 'image_path', pi.image_path, 'is_primary', pi.is_primary)) AS images
        FROM products p
        JOIN statuses s ON p.status_id = s.status_id
        JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN attribute_details ad ON p.product_id = ad.product_id
        LEFT JOIN product_images pi ON p.product_id = pi.product_id
        WHERE p.product_id = $1
        GROUP BY p.product_id, s.status_id, c.category_id;
      `;

      const updatedProduct = await pool.query(updatedProductQuery, [
        product_id,
      ]);
      if (updatedProduct.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      const result = updatedProduct.rows[0];
      if (
        !result.attributes ||
        result.attributes.some(
          (attr) => attr.key === null || attr.values === null
        )
      ) {
        result.attributes = [];
      }

      res
        .status(200)
        .json({ message: "Product updated successfully", product: result });
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error updating product:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  };

  async deleteProduct(req, res) {
    const adminId = req.user && req.user.id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    try {
      await pool.query("BEGIN");

      const productCheck = await pool.query(
        "SELECT created_by_user_id FROM products WHERE product_id = $1",
        [id]
      );
      if (
        productCheck.rows.length === 0 ||
        productCheck.rows[0].created_by_user_id !== adminId
      ) {
        await pool.query("ROLLBACK");
        return res.status(403).json({ message: "Access denied" });
      }

      const ordersCheck = await pool.query(
        "SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1",
        [id]
      );

      if (ordersCheck.rowCount > 0) {
        await pool.query("ROLLBACK");
        return res.status(400).json({
          message: "Продукт має активне замовлення і не може бути видалений.",
        });
      }

      const images = await pool.query(
        "SELECT image_path FROM product_images WHERE product_id = $1",
        [id]
      );

      await pool.query("DELETE FROM product_images WHERE product_id = $1", [
        id,
      ]);
      await pool.query("DELETE FROM product_attributes WHERE product_id = $1", [
        id,
      ]);
      await pool.query(
        "DELETE FROM products WHERE product_id = $1 RETURNING *",
        [id]
      );

      images.rows.forEach((image) => {
        const imagePath = path.join(
          __dirname,
          "..",
          "..",
          "..",
          image.image_path
        );
        fs.unlink(imagePath, (err) => {
          if (err) console.error("Failed to delete image:", err);
        });
      });

      await pool.query("COMMIT");
      res.json({ message: "Продукт видалено успішно" });
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error during product deletion:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  updateProductAttributes = async (productId, parsedAttributes) => {
    const existingAttrs = await pool.query(
      "SELECT attribute_id, attribute_key FROM product_attributes WHERE product_id = $1",
      [productId]
    );
    const existingAttrMap = new Map(
      existingAttrs.rows.map((attr) => [attr.attribute_key, attr.attribute_id])
    );

    const newAttributeKeys = new Set(
      parsedAttributes
        .filter((attr) => attr.key && attr.values && attr.values.length > 0)
        .map((attr) => attr.key)
    );

    for (const [key, attributeId] of existingAttrMap) {
      if (!newAttributeKeys.has(key)) {
        await pool.query(
          "DELETE FROM attribute_values WHERE attribute_id = $1",
          [attributeId]
        );
        await pool.query(
          "DELETE FROM product_attributes WHERE attribute_id = $1",
          [attributeId]
        );
      }
    }

    for (const attr of parsedAttributes) {
      if (attr.key && attr.values && attr.values.length > 0) {
        if (existingAttrMap.has(attr.key)) {
          const attributeId = existingAttrMap.get(attr.key);
          await pool.query(
            "DELETE FROM attribute_values WHERE attribute_id = $1",
            [attributeId]
          );
          for (const value of attr.values) {
            await pool.query(
              "INSERT INTO attribute_values (attribute_id, value) VALUES ($1, $2)",
              [attributeId, value]
            );
          }
        } else {
          const attributeResult = await pool.query(
            "INSERT INTO product_attributes (product_id, attribute_key) VALUES ($1, $2) RETURNING attribute_id",
            [productId, attr.key]
          );
          const newAttributeId = attributeResult.rows[0].attribute_id;
          for (const value of attr.values) {
            await pool.query(
              "INSERT INTO attribute_values (attribute_id, value) VALUES ($1, $2)",
              [newAttributeId, value]
            );
          }
        }
      }
    }
  };

  generateUniqueProductCode = async () => {
    let code;
    let exists = true;
    while (exists) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const { rows } = await pool.query(
        "SELECT 1 FROM products WHERE product_code = $1 LIMIT 1",
        [code]
      );
      if (rows.length === 0) {
        exists = false;
      }
    }
    return code;
  };
}

module.exports = new AdminProductsController();
