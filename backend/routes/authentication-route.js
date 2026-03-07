const express = require("express");
const router = express.Router();

const {
  create_deployment,
  get_deployments,
  delete_deployment,
  update_deployment,
  scale_deployment,
  get_deployment_pods,
} = require("../controller/auth-controller");

const authMiddleware = require("./authmiddleware");

router.post("/deployments", authMiddleware, create_deployment);
router.get("/deployments", authMiddleware, get_deployments);
router.delete("/deployments/:id", authMiddleware, delete_deployment);
router.put("/deployments/:id", authMiddleware, update_deployment);
router.post("/deployments/:id/scale", authMiddleware, scale_deployment);
router.get("/deployments/:id/pods", authMiddleware, get_deployment_pods);

module.exports = router;
