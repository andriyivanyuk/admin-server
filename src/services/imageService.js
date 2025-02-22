const pool = require("../../config/db");
const fs = require("fs");
const path = require("path");

class ImageService {
  async uploadImage(productId, imagePath, isPrimary) {
    const result = await pool.query(
      "INSERT INTO Product_Images (product_id, image_path, is_primary) VALUES ($1, $2, $3) RETURNING *;",
      [productId, imagePath, isPrimary]
    );
    return result.rows[0];
  }

  async uploadImages(productId, images) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const promises = images.map((image) =>
        client.query(
          "INSERT INTO Product_Images (product_id, image_path, is_primary) VALUES ($1, $2, $3) RETURNING *;",
          [productId, image.path, image.isPrimary]
        )
      );

      const results = await Promise.all(promises);
      await client.query("COMMIT");
      return results.map((result) => result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getImageById(imageId) {
    const result = await pool.query(
      "SELECT * FROM Product_Images WHERE image_id = $1;",
      [imageId]
    );
    return result.rows[0];
  }

  async getImagesByProductId(productId) {
    const result = await pool.query(
      "SELECT * FROM Product_Images WHERE product_id = $1;",
      [productId]
    );
    return result.rows;
  }

  async updateImage(imageId, imagePath, isPrimary) {
    const result = await pool.query(
      "UPDATE Product_Images SET image_path = $1, is_primary = $2 WHERE image_id = $3 RETURNING *;",
      [imagePath, isPrimary, imageId]
    );
    return result.rows[0];
  }

  async deleteImage(imageId) {
    const result = await pool.query(
      "DELETE FROM Product_Images WHERE image_id = $1;",
      [imageId]
    );
    return result.rowCount > 0;
  }
}

module.exports = new ImageService();
