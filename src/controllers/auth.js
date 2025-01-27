const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");

const SECRET_KEY = process.env.SECRET_KEY;

class AuthController {
  register = async (req, res) => {
    const { username, password, email, firstname, lastname } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 8);
      const result = await pool.query(
        "INSERT INTO users (username, password_hash, email, firstname, lastname) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [username, hashedPassword, email, firstname, lastname]
      );

      const user = result.rows[0];
      res.status(201).send(user);
    } catch (error) {
      res.status(500).send("Error during registration: " + error.message);
    }
  };

  login = async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );

      const user = result.rows[0];
      if (!user) {
        return res.status(404).send("User not found");
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return res.status(401).send("Invalid password");
      }

      const token = jwt.sign({ id: user.user_id }, SECRET_KEY, {
        expiresIn: "3h",
      });
      res.send({ user, token });
    } catch (error) {
      res.status(500).send("Error during login: " + error.message);
    }
  };
}

module.exports = new AuthController();
