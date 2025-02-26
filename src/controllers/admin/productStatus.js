const pool = require("../../../config/db");

class StatusesController {
  async getStatuses(req, res) {
    try {
      const result = await pool.query(
        "SELECT * FROM Statuses ORDER BY status_name"
      );
      res.status(200).json(result.rows);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error retrieving statuses: " + error.message });
    }
  }
}

module.exports = new StatusesController();
