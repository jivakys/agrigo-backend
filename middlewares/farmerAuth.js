const { authenticate } = require("./authenticate");

const farmerAuth = (req, res, next) => {
  authenticate(req, res, () => {
    if (req.user.role !== "farmer") {
      return res
        .status(403)
        .json({ message: "Access denied. Farmer role required." });
    }
    next();
  });
};

module.exports = { farmerAuth };
