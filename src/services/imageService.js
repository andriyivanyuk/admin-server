const pool = require("../../config/db");
const fs = require("fs");
const path = require("path");

const { uploadFile } = require("../../modules/uploadToR2");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../../config/r2-client");

class ImageService {
  async uploadImages(productId, images, adminId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const promises = images.map(async (image) => {
        const imageUrl = await uploadFile(adminId, productId, image.path);
        await fs.promises.unlink(image.path);
        const result = await client.query(
          "INSERT INTO Product_Images (product_id, image_path, is_primary) VALUES ($1, $2, $3) RETURNING *;",
          [productId, imageUrl, image.isPrimary]
        );
        return result.rows[0];
      });

      const results = await Promise.all(promises);
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // async deleteImages(imageIds) {
  //   const ids = Array.isArray(imageIds) ? imageIds : JSON.parse(imageIds);
  //   const client = await pool.connect();
  //   try {
  //     await client.query("BEGIN");

  //     const selectQuery = `
  //       SELECT image_path FROM Product_Images WHERE image_id = ANY($1);
  //     `;
  //     const imagePaths = await client.query(selectQuery, [ids]);

  //     const deleteFilesPromises = imagePaths.rows.map((row) =>
  //       fs.promises.unlink(path.join(__dirname, "..", "..", row.image_path))
  //     );

  //     await Promise.all(deleteFilesPromises);

  //     const deleteQuery = `
  //       DELETE FROM Product_Images WHERE image_id = ANY($1);
  //     `;
  //     await client.query(deleteQuery, [ids]);
  //     await client.query("COMMIT");
  //   } catch (error) {
  //     await client.query("ROLLBACK");
  //     console.error("Error during deleting images: ", error);
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // }
  async deleteImages(imageIds) {
    // imageIds може бути масивом або рядком JSON
    const ids = Array.isArray(imageIds) ? imageIds : JSON.parse(imageIds);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Отримуємо шляхи зображень з бази даних
      const selectQuery = `
        SELECT image_path FROM Product_Images WHERE image_id = ANY($1);
      `;
      const imagePathsResult = await client.query(selectQuery, [ids]);

      // Для кожного шляху видаляємо об’єкт з R2
      const deletePromises = imagePathsResult.rows.map(async (row) => {
        // image_path виглядає як:
        // "https://pub-f2a1168bcc8267043d925c14d7a08960.r2.dev/users/2/products/4/1742823685385-hoodie.webp"
        // Отже, потрібно отримати ключ об’єкта, тобто частину після домену:
        const url = new URL(row.image_path);
        const objectKey = url.pathname.substring(1); // видаляємо початковий "/"

        // Викликаємо видалення об’єкта з R2
        await r2.send(
          new DeleteObjectCommand({
            Bucket: "digital-images",
            Key: objectKey,
          })
        );
      });

      await Promise.all(deletePromises);

      // Видаляємо записи з бази даних
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
