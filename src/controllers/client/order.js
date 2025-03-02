const pool = require("../../../config/db");

class ClientOrderController {
  async createOrder(req, res) {
    const { email, phone, title, items } = req.body;

    try {
      await pool.query("BEGIN");

      const customerResult = await pool.query(
        "INSERT INTO customers (email, phone, title) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone, title = EXCLUDED.title RETURNING customer_id",
        [email, phone, title]
      );
      const customerId = customerResult.rows[0].customer_id;

      const statusResult = await pool.query(
        "SELECT status_id FROM OrderStatuses WHERE status_name = 'Новий'"
      );
      if (statusResult.rows.length === 0) {
        res
          .status(500)
          .json({ message: "Статус 'Новий' не знайдено в базі даних." });
        return;
      }
      const statusId = statusResult.rows[0].status_id;

      const orderResult = await pool.query(
        "INSERT INTO orders (customer_id, status_id) VALUES ($1, $2) RETURNING order_id",
        [customerId, statusId]
      );
      const orderId = orderResult.rows[0].order_id;

      let totalCost = 0;
      for (const item of items) {
        const itemCost = item.price * item.quantity;
        totalCost += itemCost;
        await pool.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
          [orderId, item.product_id, item.quantity, item.price]
        );
      }

      await pool.query("COMMIT");

      const io = req.app.get("io");
      if (io) {
        const orderDetails = await pool.query(
          `SELECT o.order_id, os.status_name AS status, c.email, c.phone, c.title AS customer_name, 
                  json_agg(json_build_object(
                    'product_id', p.product_id,
                    'title', p.title,
                    'quantity', oi.quantity,
                    'price', oi.price
                  )) AS items,
                  ${totalCost} AS total_cost
           FROM orders o
           JOIN customers c ON o.customer_id = c.customer_id
           JOIN order_items oi ON o.order_id = oi.order_id
           JOIN products p ON oi.product_id = p.product_id
           JOIN OrderStatuses os ON o.status_id = os.status_id
           WHERE o.order_id = $1
           GROUP BY o.order_id, os.status_name, c.email, c.phone, c.title`,
          [orderId]
        );

        const orderData = orderDetails.rows[0];
        orderData.total_cost = totalCost;

        io.emit("newOrder", orderData);
      } else {
        console.error("❌ WebSocket-сервер (io) не знайдено");
      }

      res.status(201).json({
        message: "Order created successfully",
        orderId: orderId,
        totalCost: totalCost,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      res
        .status(500)
        .json({ message: "Error creating order: " + error.message });
    }
  }
}

module.exports = new ClientOrderController();
