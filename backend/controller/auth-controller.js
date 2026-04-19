const { otpdb, userdb, Deployment_db, pod_db } = require("./database");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { getPodLogs, k8sApiLogs } = require("../services/k8sServices");
const {
  createDeployment,
  deleteDeployment,
  getDeployments,
  scaleDeployment,
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

// Create deployment

const create_deployment = async (req, res) => {
  try {
    const { name, image, replicas, containerPort } = req.body;
    const userId = req.userId;

    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const uniqueName = `${safeName}-${Date.now()}`;

    // saving to mongodb the desired state

    const desiredState = await Deployment_db.create({
      name: uniqueName,
      image: image || "registry.k8s.io/pause:3.10",
      replicas: replicas || 1,
      containerPort: containerPort || 80,
      createdBy: userId,
      status: "active",
    });

    //this is the actual state
    await createDeployment({
      name: uniqueName,
      image: desiredState.image,
      replicas: desiredState.replicas,
      containerPort: desiredState.containerPort,
    });

    res.status(201).json({
      msg: "Deployment created",
      deployment: desiredState,
    });
  } catch (err) {
    res.status(500).json({
      msg: "Error in creating deployment",
      error: err.body?.message || err.message,
    });
  }
};

// delete deployments
const delete_deployment = async (req, res) => {
  try {
    const name = req.params.id;
    const userId = req.userId;

    if (!name || name === "undefined") {
      return res.status(400).json({ msg: "Deployment name is required" });
    }

    // delete from mongodb
    await Deployment_db.findOneAndUpdate(
      { name, createdBy: userId },
      { status: "deleted" },
    );

    //delete from k8s
    await deleteDeployment(name);

    res.json({ msg: `Deployment ${name} permanently removed` });
  } catch (err) {
    console.error("K8s Delete Error:", err.body || err.message);
    res.status(500).json({
      msg: "Error deleting deployment",
      error: err.body?.message || err.message,
    });
  }
};

// get user deployments
const get_all_deployments = async (req, res) => {
  try {
    const userId = req.userId;

    // get desired state from DB for this user
    const myDesiredApps = await Deployment_db.find({
      createdBy: userId,
      status: "active",
    });

    // get actual state from K8s
    const k8sApps = await getDeployments();

    const result = myDesiredApps.map((dbApp) => {
      const actual = k8sApps.find((k) => k.name === dbApp.name);
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
      return res
        .status(404)
        .json({ msg: "Deployment not found in your records" });
    }

    await scaleDeployment(name, replicaCount);

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

const get_deployment_logs = async (req, res) => {
  try {
    const { name } = req.params; // This is the deployment name from the URL

    // Finding the pods belonging to this deployment using a label selector
    //  use k8sApiLogs because listNamespacedPod is a CoreV1 operation
    const podRes = await k8sApiLogs.listNamespacedPod(
      "default",
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${name}`, // matches the label  tht is set in createDeployment
    );

    const pods = podRes.body.items;
    console.log(pods);
    if (!pods || pods.length === 0) {
      return res
        .status(404)
        .json({ msg: "No active pods found for this deployment" });
    }

    //  Get the name of the first pod found
    const podName = pods[0].metadata.name;

    // Fetch the actual logs using the function in your services file
    const logs = await getPodLogs(podName);

    res.json({ podName, logs });
  } catch (err) {
    console.error("Log Fetch Error:", err.message);
    res.status(500).json({ msg: "Failed to fetch logs", error: err.message });
  }
};
const get_all_pods = async (req, res) => {
  try {
    const userId = req.userId;
    console.log("Fetching pods for user:", userId);

    // Fetch all pods from the pod_db
    const allPods = await pod_db.find({});

    // Fetch all deployments belonging to this user
    const userDeployments = await Deployment_db.find({ createdBy: userId });
    const userDeploymentIds = userDeployments.map((d) => d._id.toString());

    // Filter pods that belong to the user's deployments
    const filteredPods = allPods.filter(
      (pod) =>
        pod.deploymentId &&
        userDeploymentIds.includes(pod.deploymentId.toString()),
    );

    res.status(200).json(filteredPods);
  } catch (err) {
    console.error("GET_ALL_PODS ERROR:", err);
    res
      .status(500)
      .json({ msg: "Server Error fetching pods", error: err.message });
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
};
