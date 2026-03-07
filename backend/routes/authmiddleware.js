const jwt = require("jsonwebtoken");
const { userdb } = require("../controller/database");
require("dotenv").config();
const authmiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Token missing" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userdb.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ msg: "Unauthorized" });
  }
};

module.exports = authmiddleware;
