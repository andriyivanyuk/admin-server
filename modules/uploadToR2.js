const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2-client");
const fs = require("fs");
const path = require("path");

async function uploadFile(userId, productId, filePath) {
  const fileStream = fs.createReadStream(filePath);
  const key = `users/${userId}/products/${productId}/${path.basename(
    filePath
  )}`;

  const params = {
    Bucket: "digital-images",
    Key: key,
    Body: fileStream,
    ContentType: "image/webp",
  };

  try {
    await r2.send(new PutObjectCommand(params));
    return `https://pub-f2a1168bcc8267043d925c14d7a08960.r2.dev/${key}`;
  } catch (err) {
    console.error("Error uploading file:", err);
    throw err;
  }
}

module.exports = { uploadFile };
