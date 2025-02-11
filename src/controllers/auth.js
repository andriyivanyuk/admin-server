const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");

const pool = require("../../config/db");

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

class AuthController {
  register = async (req, res) => {
    const { username, password, email } = req.body;
    try {
      const existingUser = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: "Email already in use." });
      }

      const hashedPassword = await bcrypt.hash(password, 8);
      const verificationToken = crypto.randomBytes(20).toString("hex");
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 1);

      const result = await pool.query(
        "INSERT INTO users (username, password_hash, email, is_verified, verification_token, token_expires) VALUES ($1, $2, $3, false, $4, $5) RETURNING *",
        [username, hashedPassword, email, verificationToken, tokenExpires]
      );

      const user = result.rows[0];
      await this.sendVerificationEmail(
        email,
        `http://localhost:4200/auth/verify/${verificationToken}`
      );
      res.status(201).json({
        user: user.username,
        email: user.email,
        status: "pending_verification",
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error during registration: " + error.message });
    }
  };

  sendVerificationEmail = async (userEmail, verificationLink) => {
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
      from: `"Your Service Name" <${process.env.GMAIL_EMAIL}>`,
      to: userEmail,
      subject: "Please confirm your email",
      html: `<b>Click here to confirm your email:</b> <a href="${verificationLink}">Confirm Email</a>`,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log("Verification email sent: %s", result.messageId);
    } catch (error) {
      console.error("Failed to send verification email: ", error);
    }
  };

  verifyEmail = async (req, res) => {
    const { token } = req.params;
    try {
      const user = await pool.query(
        "SELECT * FROM users WHERE verification_token = $1 AND token_expires > NOW()",
        [token]
      );

      if (user.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "Token is invalid or has expired." });
      }

      await pool.query(
        "UPDATE users SET is_verified = true, verification_token = NULL, token_expires = NULL WHERE user_id = $1",
        [user.rows[0].user_id]
      );

      res.status(200).json({ message: "Email verified successfully!" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error verifying email: " + error.message });
    }
  };

  login = async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);

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

      const token = jwt.sign({ id: user.user_id }, process.env.SECRET_KEY, {
        expiresIn: "3h",
      });
      res.send({ user, token });
    } catch (error) {
      res.status(500).send("Error during login: " + error.message);
    }
  };
}

module.exports = new AuthController();
