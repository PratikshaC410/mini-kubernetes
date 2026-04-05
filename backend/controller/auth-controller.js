const { otpdb, userdb } = require("./database");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const {
  createDeployment,
  scaleDeployment,
  deleteDeployment,
  getDeployments,
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

// CREATE
const create_deployment = async (req, res) => {
  try {
    const { name, image, replicas, containerPort } = req.body;

    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const uniqueName = `${safeName}-${Date.now()}`;

    const finalImage = image || "registry.k8s.io/pause:3.10";

    await createDeployment({
      name: uniqueName,
      image: finalImage,
      replicas: replicas || 1,
      containerPort: containerPort || 80,
    });

    res.status(201).json({
      msg: "Deployment created successfully",
      name: uniqueName,
    });
  } catch (err) {
    console.error("K8s Create Error:", err.body || err.message);
    res.status(500).json({
      msg: "Error creating deployment",
      error: err.body?.message || err.message,
    });
  }
};

// scale the deployment
const scale_deployment = async (req, res) => {
  try {
    const { replicas } = req.body;
    const name = req.params.id;

    if (!name || name === "undefined") {
      return res.status(400).json({ msg: "Deployment name is required" });
    }

    await scaleDeployment(name, replicas);

    res.json({
      msg: `Scaled ${name} to ${replicas} replicas`,
      replicas: parseInt(replicas),
    });
  } catch (err) {
    console.error("K8s Scale Error:", err.body || err.message);
    res.status(500).json({
      msg: "Error scaling deployment",
      error: err.body?.message || err.message,
    });
  }
};

// delete deployments
const delete_deployment = async (req, res) => {
  try {
    const name = req.params.id;

    if (!name || name === "undefined") {
      return res.status(400).json({ msg: "Deployment name is required" });
    }

    await deleteDeployment(name);

    res.json({ msg: `Deployment ${name} deleted` });
  } catch (err) {
    console.error("K8s Delete Error:", err.body || err.message);
    res.status(500).json({
      msg: "Error deleting deployment",
      error: err.body?.message || err.message,
    });
  }
};

// get deployments
const get_all_deployments = async (req, res) => {
  try {
    const deployments = await getDeployments();
    res.json(deployments);
  } catch (err) {
    console.error("K8s Get Error:", err.body || err.message);
    res.status(500).json({
      msg: "Error fetching deployments",
      error: err.body?.message || err.message,
    });
  }
};

module.exports = {
  register,
  verifyotp,
  login,
  create_deployment,
  scale_deployment,
  delete_deployment,
  get_all_deployments,
};
