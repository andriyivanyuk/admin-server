const requireSuperadmin = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).send("Access denied. Superadmin role required.");
  }
  next();
};

module.exports = requireSuperadmin;
