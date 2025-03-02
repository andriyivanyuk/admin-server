const pool = require("../../../config/db");

class OrderStatusController {
  async getStatuses(req, res) {
    try {
      const statusesData = await pool.query("SELECT * FROM OrderStatuses");
      res.status(200).json(statusesData.rows);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error retrieving order statuses: " + error.message });
    }
  }
}

module.exports = new OrderStatusController();
