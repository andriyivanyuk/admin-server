const pool = require("../../../config/db");

class ClientOrderController {
  async getOrders(req, res) {
    try {
      const ordersData = await pool.query(
        `SELECT o.order_id, o.status, c.email, c.phone, c.title AS customer_name,
                    json_agg(json_build_object(
                      'product_id', p.product_id,
                      'title', p.title,
                      'quantity', oi.quantity,
                      'price', oi.price,
                      'image_path', pi.image_path
                    )) AS items,
                    SUM(oi.price * oi.quantity) AS total_cost
             FROM orders o
             JOIN customers c ON o.customer_id = c.customer_id
             JOIN order_items oi ON o.order_id = oi.order_id
             JOIN products p ON oi.product_id = p.product_id
             LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = true
             GROUP BY o.order_id, c.email, c.phone, c.title`
      );

      res.status(200).json(ordersData.rows);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error retrieving orders: " + error.message });
    }
  }

  async getOrderDetails(req, res) {
    const { orderId } = req.params;
    try {
      const orderDetails = await pool.query(
        `SELECT o.order_id, o.status, c.email, c.phone, c.title AS customer_name, 
                    json_agg(json_build_object(
                      'product_id', p.product_id,
                      'title', p.title,
                      'quantity', oi.quantity,
                      'price', oi.price,
                      'image_path', pi.image_path
                    )) AS items,
                    SUM(oi.price * oi.quantity) AS total_cost
             FROM orders o
             JOIN customers c ON o.customer_id = c.customer_id
             JOIN order_items oi ON o.order_id = oi.order_id
             JOIN products p ON oi.product_id = p.product_id
             LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = true
             WHERE o.order_id = $1
             GROUP BY o.order_id, c.email, c.phone, c.title`,
        [orderId]
      );

      if (orderDetails.rows.length > 0) {
        res.status(200).json(orderDetails.rows[0]);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error retrieving order details: " + error.message });
    }
  }
}

module.exports = new ClientOrderController();
