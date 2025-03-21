const pool = require("../../../config/db");

class AdminStoreController {
  getStoreId = async (req, res) => {
    const adminId = req.user && req.user.id;
    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const result = await pool.query(
        "SELECT store_id FROM Store WHERE user_id = $1",
        [adminId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Магазин не знайдено для поточного адміністратора.",
        });
      }

      res.status(200).json({ store_id: result.rows[0].store_id });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  };
}

module.exports = new AdminStoreController();
