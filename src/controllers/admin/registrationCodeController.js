const crypto = require("crypto");
const pool = require("../../../config/db");

class RegistrationCodeController {
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

  deleteCode = async (req, res) => {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Доступ заборонено." });
      }

      const { code } = req.params;
      if (!code) {
        return res.status(400).json({ message: "No code specified." });
      }

      const query = `
        DELETE FROM registration_codes
        WHERE code = $1
        RETURNING code
      `;
      const result = await pool.query(query, [code]);

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Код не знайдено." });
      }

      return res.status(200).json({ message: `Код ${code} було видалено.` });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
}

module.exports = new RegistrationCodeController();
