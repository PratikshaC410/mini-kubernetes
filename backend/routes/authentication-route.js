const express = require("express");
const router = express.Router();

const {
  create_deployment,
  get_all_deployments,
  delete_deployment,
  scale_deployment,
  register,
  verifyotp,
  login,
} = require("../controller/auth-controller");

const authMiddleware = require("./authmiddleware");

router.post("/deployments", authMiddleware, create_deployment);
router.get("/deployments", authMiddleware, get_all_deployments);
router.delete("/deployments/:id", authMiddleware, delete_deployment);
router.patch("/deployments/scale", authMiddleware, scale_deployment);
router.post("/register", register);
router.post("/verify", verifyotp);
router.post("/login", login);
module.exports = router;
