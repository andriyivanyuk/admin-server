require("dotenv").config({ path: "../.env" });
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME;
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

const seedSuperAdmin = async () => {
  console.log(SUPERADMIN_USERNAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
  try {
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 8);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, email, is_verified, role)
       VALUES ($1, $2, $3, true, 'superadmin')
       RETURNING *`,
      [SUPERADMIN_USERNAME, hashedPassword, SUPERADMIN_EMAIL]
    );

    console.log("Superadmin created successfully:");
    console.log(result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error("Error creating superadmin:", error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
