const pool = require("../../../config/db");

const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

class AdminOrderController {
  getOrders = async (req, res) => {
    try {
      const ordersData = await pool.query(
        `SELECT 
            o.order_id, 
            o.status_id,
            os.status_name AS status_name, 
            c.email, 
            c.phone, 
            c.title AS customer_name,
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
         LEFT JOIN product_images pi 
           ON p.product_id = pi.product_id AND pi.is_primary = true
         JOIN OrderStatuses os ON os.status_id = o.status_id
         GROUP BY o.order_id, o.status_id, c.email, c.phone, c.title, os.status_name`
      );

      res.status(200).json(ordersData.rows);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error retrieving orders: " + error.message });
    }
  };

  getOrderDetails = async (req, res) => {
    const { orderId } = req.params;
    try {
      const orderDetails = await pool.query(
        `SELECT o.order_id, 
                o.status_id,
                os.status_name AS status, 
                c.email, 
                c.phone, 
                c.title AS customer_name, 
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
         JOIN OrderStatuses os ON os.status_id = o.status_id
         WHERE o.order_id = $1
         GROUP BY o.order_id, o.status_id, c.email, c.phone, c.title, os.status_name`,
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
  };

  updateOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { statusId } = req.body;

    try {
      const statusExists = await pool.query(
        "SELECT 1 FROM OrderStatuses WHERE status_id = $1",
        [statusId]
      );

      if (statusExists.rowCount === 0) {
        return res
          .status(404)
          .json({ message: "Статус замовлення не знайдено." });
      }

      const updateResult = await pool.query(
        "UPDATE orders SET status_id = $1 WHERE order_id = $2",
        [statusId, orderId]
      );

      if (updateResult.rowCount > 0) {
        const orderData = await pool.query(
          `SELECT o.order_id, os.status_name, c.email, c.title AS customer_name
           FROM orders o
           JOIN customers c ON o.customer_id = c.customer_id
           JOIN OrderStatuses os ON o.status_id = os.status_id
           WHERE o.order_id = $1`,
          [orderId]
        );

        if (orderData.rows.length > 0) {
          const order = orderData.rows[0];
          const emailBody = `<p>Ваше замовлення №${orderId} "${order.status_name}".</p><p>Дякуємо, що вибрали нас!</p>`;

          await this.sendEmail(
            order.email,
            "Оновлення статусу замовлення",
            emailBody
          );

          res.json({
            message: "Статус замовлення та повідомлення успішно оновлено",
            order: order,
          });
        } else {
          res.status(404).json({ message: "Замовлення не знайдено." });
        }
      } else {
        res.status(404).json({ message: "Замовлення не знайдено." });
      }
    } catch (error) {
      res.status(500).json({
        message: "Помилка при оновленні статусу замовлення: " + error.message,
      });
    }
  };

  sendEmail = async (to, subject, htmlContent) => {
    const accessToken = await oauth2Client.getAccessToken();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_EMAIL,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: `"Digital Engineers" <${process.env.GMAIL_EMAIL}>`,
      to: to,
      subject: subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
  };
}

module.exports = new AdminOrderController();
