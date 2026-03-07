const { Deployment_db, pod_db, otpdb, DB, userdb } = require("./database");
require("dotenv").config();

const create_deployment = async (req, res) => {
  try {
    const { name, image, replicas, containerPort, cpuLimit, memoryLimit } =
      req.body;

    if (!name || !image || !containerPort) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const deployment = await Deployment_db.create({
      name,
      image,
      replicas,
      containerPort,
      cpuLimit,
      memoryLimit,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Deployment created successfully",
      deployment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const delete_deployment = async (req, res) => {
  try {
    const deployment = await Deployment_db.findById(req.params.id);

    if (!deployment) {
      return res.status(404).json({ message: "Deployment not found" });
    }

    if (deployment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    deployment.status = "deleted";
    await deployment.save();

    res.json({ message: "Deployment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_deployments = async (req, res) => {
  try {
    const deployments = await Deployment_db.find({
      createdBy: req.user._id,
      status: "active",
    });

    res.json(deployments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const scale_deployment = async (req, res) => {
  try {
    const { replicas } = req.body;

    const deployment = await Deployment_db.findById(req.params.id);

    if (!deployment) {
      return res.status(404).json({ message: "Deployment not found" });
    }

    deployment.replicas = replicas;

    await deployment.save();

    res.json({
      message: "Deployment scaled successfully",
      replicas,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update_deployment = async (req, res) => {
  try {
    const updates = req.body;

    const deployment = await Deployment_db.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true },
    );

    res.json({
      message: "Deployment updated",
      deployment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const get_deployment_pods = async (req, res) => {
  try {
    const pods = await pod_db.find({
      deploymentId: req.params.id,
    });

    res.json(pods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create_deployment,
  get_deployments,
  delete_deployment,
  scale_deployment,
  update_deployment,
  get_deployment_pods,
};
