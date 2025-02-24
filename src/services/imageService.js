const pool = require("../../config/db");
const fs = require("fs");
const path = require("path");

class ImageService {
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

  async deleteImages(imageIds) {
    const ids = Array.isArray(imageIds) ? imageIds : JSON.parse(imageIds);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const selectQuery = `
        SELECT image_path FROM Product_Images WHERE image_id = ANY($1);
      `;
      const imagePaths = await client.query(selectQuery, [ids]);

      const deleteFilesPromises = imagePaths.rows.map((row) =>
        fs.promises.unlink(path.join(__dirname, "..", "..", row.image_path))
      );

      await Promise.all(deleteFilesPromises);

      const deleteQuery = `
        DELETE FROM Product_Images WHERE image_id = ANY($1);
      `;
      await client.query(deleteQuery, [ids]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error during deleting images: ", error);
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
}

module.exports = new ImageService();
