const { otpdb, userdb, Deployment_db, pod_db } = require("./database");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { getPodLogs, k8sApiLogs } = require("../services/k8sServices");
const { encrypt } = require("../services/encrypt");
const {
  createDeployment,
  deleteDeployment,
  getDeployments,
  scaleDeployment,
  getPods,
  k8sApi,
} = require("../services/k8sServices");

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  auth: {
    user: "chougulepratiksha23@gmail.com",
    pass: process.env.GOOGLE_SECRET_KEY,
  },
});

function generateOTP() {
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await userdb.findOne({ email });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hash_password = await bcrypt.hash(password, 10);

    if (!existingUser) {
      await userdb.create({
        username,
        email,
        password: hash_password,
        isVerified: false,
      });
    }

    const otp = generateOTP();
    const hash_otp = await bcrypt.hash(otp, 10);
    const expire_time = new Date(Date.now() + 10 * 60 * 1000);

    await otpdb.deleteMany({ email });

    await otpdb.create({
      username,
      email,
      otp: hash_otp,
      num_attempts: 0,
      is_otp_used: false,
      expire_time,
    });

    await transporter.sendMail({
      from: '"mini-kubernetes" <chougulepratiksha23@gmail.com>',
      to: email,
      subject: "Email Verification OTP",
      html: `<p>Your verification code is <b>${otp}</b></p>`,
    });

    res.status(200).json({ msg: "OTP sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "error" });
  }
};

const verifyotp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await otpdb.findOne({ email });

    if (!record) return res.status(404).json({ msg: "Invalid email" });

    if (record.expire_time < new Date()) {
      return res.status(400).json({ msg: "OTP expired" });
    }

    const match = await bcrypt.compare(otp, record.otp);

    if (!match) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    await userdb.updateOne({ email }, { $set: { isVerified: true } });

    res.json({ msg: "Verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userdb.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid credentials" });

    const token = await user.generateToken();

    res.json({ msg: "Login success", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "error" });
  }
};

// CREATE DEPLOYMENT

const create_deployment = async (req, res) => {
  try {
    // 1. Capture envVars and secrets from the request body
    const {
      name,
      image,
      replicas,
      containerPort,
      namespace,
      envVars,
      secrets,
    } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ msg: "Unauthorized: No User ID found" });
    }

    const targetNamespace = namespace || "default";

    // --- NAMESPACE LOGIC ---
    try {
      await k8sApi.readNamespace(targetNamespace);
    } catch (err) {
      if (err.response && err.response.statusCode === 404) {
        await k8sApi.createNamespace({
          metadata: { name: targetNamespace },
        });
      } else {
        throw err;
      }
    }

    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const uniqueName = `${safeName}-${Date.now()}`;

    // 2. Encrypt secrets before saving to the database
    const processedSecrets = (secrets || []).map((s) => ({
      key: s.key,
      encryptedValue: encrypt(s.value), // Encrypting sensitive data at rest
    }));

    // 3. Save to MongoDB including the new arrays
    const desiredState = await Deployment_db.create({
      name: uniqueName,
      image: image || "registry.k8s.io/pause:3.10",
      replicas: replicas || 1,
      containerPort: containerPort || 80,
      namespace: targetNamespace,
      createdBy: userId,
      status: "active",
      envVars: envVars || [], // Save ConfigMap data
      secrets: processedSecrets, // Save Encrypted Secret data
    });

    // 4. Pass the data to the Kubernetes service
    await createDeployment({
      name: uniqueName,
      image: desiredState.image,
      replicas: desiredState.replicas,
      containerPort: desiredState.containerPort,
      namespace: desiredState.namespace,
      envVars: desiredState.envVars,
      secrets: desiredState.secrets,
    });

    res.status(201).json({
      msg: "Deployment created",
      deployment: desiredState,
    });
  } catch (err) {
    console.error("Backend Create Error:", err.response?.body || err.message);
    res.status(500).json({
      msg: "Error in creating deployment",
      error: err.response?.body?.message || err.message,
    });
  }
};

//  DELETE DEPLOYMENT
const delete_deployment = async (req, res) => {
  try {
    const name = req.params.id;
    const userId = req.userId;

    if (!name || name === "undefined") {
      return res.status(400).json({ msg: "Deployment name is required" });
    }

    const deployment = await Deployment_db.findOne({
      name,
      createdBy: userId,
    });

    if (!deployment) {
      return res.status(404).json({ msg: "Deployment not found" });
    }

    await Deployment_db.updateOne(
      { _id: deployment._id },
      { status: "deleted" },
    );

    await deleteDeployment(name, deployment.namespace || "default");

    res.json({ msg: `Deployment ${name} permanently removed` });
  } catch (err) {
    console.error("K8s Delete Error:", err.body || err.message);
    res.status(500).json({
      msg: "Error deleting deployment",
      error: err.body?.message || err.message,
    });
  }
};

//  GET USER DEPLOYMENTS
const get_all_deployments = async (req, res) => {
  try {
    const userId = req.userId;

    const myDesiredApps = await Deployment_db.find({
      createdBy: userId,
      status: "active",
    });

    const k8sApps = await getDeployments();

    const result = myDesiredApps.map((dbApp) => {
      const actual = k8sApps.find(
        (k) =>
          k.name === dbApp.name &&
          (k.namespace || "default") === (dbApp.namespace || "default"),
      );

      return {
        ...dbApp._doc,
        actualStatus: actual ? actual.status : "Offline",
        availableReplicas: actual ? actual.availableReplicas : 0,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("K8s Get Error:", err.body || err.message);
    res.status(500).json({
      msg: "Error fetching deployments",
      error: err.body?.message || err.message,
    });
  }
};

//  SCALE DEPLOYMENT
const scale_deployment = async (req, res) => {
  try {
    const { name, replicas } = req.body;
    const userId = req.userId;

    const replicaCount = parseInt(replicas);

    const updatedDb = await Deployment_db.findOneAndUpdate(
      { name, createdBy: userId },
      { replicas: replicaCount },
      { new: true },
    );

    if (!updatedDb) {
      return res.status(404).json({ msg: "Deployment not found" });
    }

    await scaleDeployment(name, replicaCount, updatedDb.namespace || "default");

    res.json({
      msg: `Scaled ${name} to ${replicaCount}`,
      deployment: updatedDb,
    });
  } catch (err) {
    console.error("Scale Error:", err.response?.body || err.message);
    res.status(500).json({
      msg: "Scaling failed",
      error: err.response?.body?.message || err.message,
    });
  }
};

//  GET DEPLOYMENT LOGS
const get_deployment_logs = async (req, res) => {
  try {
    const { name } = req.params;
    const userId = req.userId;

    const deployment = await Deployment_db.findOne({
      name,
      createdBy: userId,
    });

    if (!deployment) {
      return res.status(404).json({ msg: "Deployment not found" });
    }

    const namespace = deployment.namespace || "default";

    const podRes = await k8sApiLogs.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${name}`,
    );

    const pods = podRes.body.items;

    if (!pods || pods.length === 0) {
      return res
        .status(404)
        .json({ msg: "No active pods found for this deployment" });
    }

    const podName = pods[0].metadata.name;

    const logs = await getPodLogs(podName, namespace);

    res.json({ podName, logs });
  } catch (err) {
    console.error("Log Fetch Error:", err.message);
    res.status(500).json({
      msg: "Failed to fetch logs",
      error: err.message,
    });
  }
};

//  GET USER PODS

const get_all_pods = async (req, res) => {
  try {
    const pods = await getPods(); // from your service

    // map pods properly for frontend
    const formatted = pods.map((pod) => ({
      podName: pod.podName,
      nodeId: pod.nodeId,
      status: pod.status, //  already computed
      restartCount: pod.restartCount,
      deploymentName: pod.deploymentName, // important
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("Error fetching pods:", err);
    res.status(500).json({ error: "Failed to fetch pods" });
  }
};

//  GET NODES
const get_all_nodes = async (req, res) => {
  try {
    const nodes = await node_db.find({});
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching nodes" });
  }
};

module.exports = {
  register,
  verifyotp,
  login,
  create_deployment,
  delete_deployment,
  get_all_deployments,
  scale_deployment,
  get_deployment_logs,
  get_all_pods,
  get_all_nodes,
};
