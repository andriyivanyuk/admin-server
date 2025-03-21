const pool = require("../../../config/db");

class ClientOrderController {
  createOrder = async (req, res) => {
    const storeId = req.headers["x-store-id"];
    if (!storeId) {
      return res.status(400).json({ message: "Missing store id in headers" });
    }

    const storeResult = await pool.query(
      "SELECT user_id FROM Store WHERE store_id = $1",
      [storeId]
    );
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }
    const adminId = storeResult.rows[0].user_id;

    const userResult = await pool.query(
      "SELECT role FROM users WHERE user_id = $1",
      [adminId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const role = userResult.rows[0].role;
    if (role === "superadmin") {
      return res.status(403).json({
        message:
          "Access denied: Superadmin's products are not available in the public store.",
      });
    }

    const {
      email,
      phone,
      firstName,
      lastName,
      items,
      comment,
      city,
      departmentNumber,
    } = req.body;
    const fullName = `${firstName} ${lastName}`;
    const trimmedDepartmentNumber = departmentNumber.substring(0, 100);

    try {
      await pool.query("BEGIN");

      const customerResult = await pool.query(
        "INSERT INTO customers (email, phone, title) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone, title = EXCLUDED.title RETURNING customer_id",
        [email, phone, fullName]
      );
      const customerId = customerResult.rows[0].customer_id;

      for (const item of items) {
        const prodResult = await pool.query(
          "SELECT created_by_user_id FROM products WHERE product_id = $1",
          [item.product_id]
        );
        if (
          prodResult.rows.length === 0 ||
          prodResult.rows[0].created_by_user_id !== adminId
        ) {
          await pool.query("ROLLBACK");
          return res.status(403).json({
            message: `Access denied: Product ${item.product_id} does not belong to this store.`,
          });
        }
      }

      const statusResult = await pool.query(
        "SELECT status_id FROM OrderStatuses WHERE status_name = 'Новий'"
      );
      if (statusResult.rows.length === 0) {
        await pool.query("ROLLBACK");
        return res.status(500).json({ message: "Status 'Новий' not found." });
      }
      const statusId = statusResult.rows[0].status_id;

      const orderResult = await pool.query(
        `INSERT INTO orders 
          (customer_id, status_id, comment, delivery_city, department_number, customer_name, customer_phone)
         VALUES 
          ($1, $2, $3, $4, $5, $6, $7)
         RETURNING order_id`,
        [
          customerId,
          statusId,
          comment,
          city,
          trimmedDepartmentNumber,
          fullName,
          phone,
        ]
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
          `SELECT o.order_id, 
                  o.status_id,
                  os.status_name AS status, 
                  o.customer_name, 
                  o.customer_phone,
                  c.email, 
                  c.phone AS customerOriginalPhone,
                  o.delivery_city AS city,
                  o.department_number AS "departmentNumber",
                  json_agg(json_build_object(
                    'product_id', p.product_id,
                    'title', p.title,
                    'quantity', oi.quantity,
                    'price', oi.price,
                    'image_path', pi.image_path
                  )) AS items,
                  ${totalCost} AS total_cost
           FROM orders o
           JOIN customers c ON o.customer_id = c.customer_id
           JOIN order_items oi ON o.order_id = oi.order_id
           JOIN products p ON oi.product_id = p.product_id
           LEFT JOIN product_images pi 
             ON p.product_id = pi.product_id AND pi.is_primary = true
           JOIN OrderStatuses os ON o.status_id = os.status_id
           WHERE o.order_id = $1
           GROUP BY o.order_id, o.status_id, os.status_name, o.customer_name, o.customer_phone, c.email, c.phone, o.delivery_city, o.department_number`,
          [orderId]
        );

        const orderData = orderDetails.rows[0];
        orderData.total_cost = totalCost;
        io.emit("newOrder", orderData);
      } else {
        console.error("WebSocket server not found");
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
  };
}

module.exports = new ClientOrderController();
