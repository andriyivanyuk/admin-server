const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");

const pool = require("../../../config/db");

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
    const { username, password, email, code } = req.body;
    try {
      const codeResult = await pool.query(
        `SELECT * FROM registration_codes
         WHERE code = $1 AND is_used = false`,
        [code]
      );

      if (codeResult.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "Невірний або прострочений код реєстрації." });
      }

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
        `INSERT INTO users (username, password_hash, email, is_verified, verification_token, token_expires, role)
         VALUES ($1, $2, $3, false, $4, $5, 'client') RETURNING *`,
        [username, hashedPassword, email, verificationToken, tokenExpires]
      );

      const user = result.rows[0];

      await pool.query(
        "UPDATE registration_codes SET is_used = true WHERE code = $1",
        [code]
      );

      await this.sendVerificationEmail(
        email,
        `http://localhost:4200/authentication/verify/${verificationToken}`
      );
      res.status(201).json({
        user: user.username,
        email: user.email,
        status:
          "В процесі верифікації. Перевірте, будь ласка, Вашу електронну пошту",
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
      from: `"Digital engineers panel" <${process.env.GMAIL_EMAIL}>`,
      to: userEmail,
      subject: "Будь ласка підтвердіть Ваш email",
      html: `<b>Натисніть, щоб підтвердити Ваш Email:</b> <a href="${verificationLink}">Підтвердити Email</a>`,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log("Email верифікації надіслано: %s", result.messageId);
    } catch (error) {
      console.error(
        "Не вдалося надіслати електронний лист для підтвердження: ",
        error
      );
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
          .json({ message: "Токен не валідний або закінчився" });
      }

      await pool.query(
        "UPDATE users SET is_verified = true, verification_token = NULL, token_expires = NULL WHERE user_id = $1",
        [user.rows[0].user_id]
      );

      res.status(200).json({ message: "Email верифіковано успішно!" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Помилка верифікації email: " + error.message });
    }
  };

  login = async (req, res) => {
    // const { email, password } = req.body;

    // try {
    //   const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    //     email,
    //   ]);

    //   const user = result.rows[0];
    //   if (!user) {
    //     return res.status(404).send("Користувача не знайдено");
    //   }

    //   if (!user.is_verified) {
    //     return res
    //       .status(403)
    //       .send(
    //         "Ваш акаунт не верифіковано. Будь ласка, перейдіть по посиланню відправленому на вашу електронну пошту для завершення реєстрації."
    //       );
    //   }

    //   const isPasswordValid = await bcrypt.compare(
    //     password,
    //     user.password_hash
    //   );
    //   if (!isPasswordValid) {
    //     return res.status(401).send("Невірний пароль");
    //   }

    //   const token = jwt.sign({ id: user.user_id }, process.env.SECRET_KEY, {
    //     expiresIn: "1d",
    //   });
    //   res.send({ user, token });
    // } catch (error) {
    //   res.status(500).send("Помилка підчас логіну: " + error.message);
    // }

    const { email, password } = req.body;

    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      const user = result.rows[0];
      if (!user) {
        return res.status(404).send("Користувача не знайдено");
      }

      if (!user.is_verified) {
        return res
          .status(403)
          .send(
            "Ваш акаунт не верифіковано. Перевірте пошту для завершення реєстрації."
          );
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return res.status(401).send("Невірний пароль");
      }

      const token = jwt.sign(
        { id: user.user_id, role: user.role },
        process.env.SECRET_KEY,
        {
          expiresIn: "1d",
        }
      );
      res.send({ user, token });
    } catch (error) {
      res.status(500).send("Помилка під час логіну: " + error.message);
    }
  };
}

module.exports = new AuthController();
