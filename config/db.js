const { Pool } = require("pg");

const pool = new Pool({
  user: "andrii",
  password: "root",
  host: "localhost",
  port: 5432,
  database: "users",
});

module.exports = pool;
