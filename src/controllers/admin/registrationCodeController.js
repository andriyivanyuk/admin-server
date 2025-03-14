const crypto = require("crypto");
const pool = require("../../../config/db");

class RegistrationCodeController {
  generateCode = async (req, res) => {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied." });
      }

      const code = crypto.randomBytes(10).toString("hex");

      const query = `
        INSERT INTO registration_codes (code, is_used, created_at)
        VALUES ($1, false, NOW())
        RETURNING code
      `;
      const result = await pool.query(query, [code]);
      return res.status(201).json({ code: result.rows[0].code });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };

  listCodes = async (req, res) => {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied." });
      }
      const query = `
        SELECT code, is_used, created_at, expires_at 
        FROM registration_codes 
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query);
      return res.status(200).json({ codes: result.rows });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
}

module.exports = new RegistrationCodeController();
