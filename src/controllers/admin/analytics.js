const pool = require("../../../config/db");

class AnalyticsController {
  getOrdersAnalytics = async (req, res) => {
    const adminId = req.user && req.user.id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const analyticsQuery = `
        SELECT
          COUNT(DISTINCT o.order_id) AS total,
          COUNT(DISTINCT CASE WHEN o.order_date >= CURRENT_DATE THEN o.order_id END) AS today,
          COUNT(DISTINCT CASE WHEN o.order_date >= date_trunc('week', CURRENT_DATE) THEN o.order_id END) AS week,
          COUNT(DISTINCT CASE WHEN o.order_date >= date_trunc('month', CURRENT_DATE) THEN o.order_id END) AS month,
          COUNT(DISTINCT CASE WHEN o.order_date >= date_trunc('year', CURRENT_DATE) THEN o.order_id END) AS year
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE p.created_by_user_id = $1;
      `;
      const result = await pool.query(analyticsQuery, [adminId]);
      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({
        message: "Error retrieving orders analytics: " + error.message,
      });
    }
  };

  getIncomeAnalytics = async (req, res) => {
    const adminId = req.user && req.user.id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const analyticsQuery = `
        SELECT
          COALESCE(SUM(oi.price * oi.quantity), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN o.order_date >= CURRENT_DATE THEN oi.price * oi.quantity ELSE 0 END), 0) AS today_revenue,
          COALESCE(SUM(CASE WHEN o.order_date >= date_trunc('month', CURRENT_DATE) THEN oi.price * oi.quantity ELSE 0 END), 0) AS month_revenue,
          COALESCE(SUM(CASE WHEN o.order_date >= date_trunc('year', CURRENT_DATE) THEN oi.price * oi.quantity ELSE 0 END), 0) AS year_revenue
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE p.created_by_user_id = $1;
      `;

      const result = await pool.query(analyticsQuery, [adminId]);
      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({
        message: "Error retrieving financial analytics: " + error.message,
      });
    }
  };
}

module.exports = new AnalyticsController();
