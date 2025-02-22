const pool = require("../../config/db");
const fs = require("fs");
const path = require("path");

const imageService = require("../services/imageService");

class ImagesController {
  async uploadImage(req, res) {
    try {
      const { productId, isPrimary } = req.body;
      const imagePath = req.file.path;
      const image = await imageService.uploadImage(
        productId,
        imagePath,
        isPrimary === "true"
      );
      res.status(201).json(image);
    } catch (error) {
      res.status(500).json({ message: "Error uploading image", error });
    }
  }

  async uploadMultipleImages(req, res) {
    const productId = req.body.productId;
    const images = req.files;

    const primary = req.body.primary;

    try {
      const uploadedImages = await imageService.uploadImages(
        productId,
        images.map((img, index) => ({
          path: img.path,
          isPrimary: index.toString() === primary,
        }))
      );

      res.status(200).json(uploadedImages);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error uploading multiple images", error });
    }
  }

  async getImage(req, res) {
    try {
      const { imageId } = req.params;
      const image = await imageService.getImageById(imageId);
      if (image) {
        res.json(image);
      } else {
        res.status(404).json({ message: "Image not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error retrieving image", error });
    }
  }

  async getImagesByProduct(req, res) {
    try {
      const { productId } = req.params;
      const images = await imageService.getImagesByProductId(productId);
      res.json(images);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error retrieving images for the product", error });
    }
  }

  async updateImage(req, res) {
    try {
      const { imageId } = req.params;
      const { imagePath, isPrimary } = req.body;
      const image = await imageService.updateImage(
        imageId,
        imagePath,
        isPrimary
      );
      res.json(image);
    } catch (error) {
      res.status(500).json({ message: "Error updating image", error });
    }
  }

  async deleteImage(req, res) {
    try {
      const { imageId } = req.params;
      const success = await imageService.deleteImage(imageId);
      if (success) {
        res.json({ message: "Image deleted successfully" });
      } else {
        res.status(404).json({ message: "Image not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error deleting image", error });
    }
  }
}

module.exports = new ImagesController();
