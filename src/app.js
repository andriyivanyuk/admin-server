const express = require("express");
require("dotenv").config();
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoriesRoutes");

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
app.use("/images", express.static("public/images"));

// Api routes
app.use("/api/auth", authRoutes);
app.use("/api", categoryRoutes);

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
