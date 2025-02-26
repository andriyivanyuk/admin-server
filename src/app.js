const express = require("express");
require("dotenv").config();
const cors = require("cors");
const http = require("http"); // Додайте цей рядок
const { setupWebSocket } = require("./services/websocket");

const authRoutes = require("./routes/admin/authRoutes");
const categoryRoutes = require("./routes/admin/categoriesRoutes");
const productStatusesRoutes = require("./routes/admin/statusesRoutes");
const productRoutes = require("./routes/admin/productRoutes");

const PORT = process.env.PORT || 3000;
const app = express();

const corsOptions = {
  origin: "http://localhost:4200",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ADMIN routes
app.use("/api/auth", authRoutes);
app.use("/api", categoryRoutes);
app.use("/api", productStatusesRoutes);
app.use("/api", productRoutes);

const server = http.createServer(app); // Використовуйте http.createServer

// Налаштування WebSocket
setupWebSocket(server);

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
