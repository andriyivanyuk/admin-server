const express = require("express");
require("dotenv").config();
const cors = require("cors");
const http = require("http");

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

//Admin routes
const authRoutes = require("./routes/admin/authRoutes");
const categoryRoutes = require("./routes/admin/categoriesRoutes");
const productStatusesRoutes = require("./routes/admin/statusesRoutes");
const orderRoutes = require("./routes/admin/orderRoutes");

const productAdminRoutes = require("./routes/admin/productRoutes");
const orderStatusesAdminRoutes = require("./routes/admin/orderStatusRoutes");

const superRoutes = require("./routes/admin/superAdminRoutes");

//Client routes
const productClientRoutes = require("./routes/client/productRoutes");
const orderClientRoutes = require("./routes/client/orderRoutes");

const SECRET_KEY = process.env.SECRET_KEY;

const PORT = process.env.PORT || 3000;
const app = express();

const corsOptionsSuperAdmin = {
  origin: ["http://localhost:4200"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  optionsSuccessStatus: 200,
};

const corsOptionsAdmin = {
  origin: ["http://localhost:4700", "http://localhost:4200"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  optionsSuccessStatus: 200,
};

const corsOptionsClient = {
  origin: "http://localhost:4500",
  methods: "GET,HEAD,POST",
  optionsSuccessStatus: 200,
};

app.use(express.json());
app.use("/uploads", express.static("uploads"));

// SUPER ADMIN routes
app.use("/api/super", cors(corsOptionsSuperAdmin), superRoutes);

// ADMIN routes
app.use("/api/auth/admin", cors(corsOptionsAdmin), authRoutes);
app.use("/api/admin", cors(corsOptionsAdmin), categoryRoutes);

// Products
app.use("/api/admin", cors(corsOptionsAdmin), productStatusesRoutes);
app.use("/api/admin", cors(corsOptionsAdmin), productAdminRoutes);

// Orders
app.use("/api/admin", cors(corsOptionsAdmin), orderRoutes);
app.use("/api/admin", cors(corsOptionsAdmin), orderStatusesAdminRoutes);

// Client routes
app.use("/api/client", cors(corsOptionsClient), productClientRoutes);
app.use("/api/client", cors(corsOptionsClient), orderClientRoutes);

const server = http.createServer(app);

// Налаштування CORS для Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4700",
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
  },
});

app.set("io", io);

// Аутентифікація для WebSocket
io.use((socket, next) => {
  const token = socket.handshake.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    socket.data.user = decoded;
    next();
  } catch (error) {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`🟢 Користувач підключився`, socket.data);

  socket.on("disconnect", () => {
    console.log(`🔴 Користувач відключився:`, socket.data);
  });
});

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
