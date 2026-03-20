const { Deployment_db, pod_db, otpdb, DB, userdb } = require("./database");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  auth: {
    user: "chougulepratiksha23@gmail.com",
    pass: process.env.GOOGLE_SECRET_KEY,
    expiresIn: "15m",
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
    console.log("Request body:", req.body);

    const { username, email, password } = req.body;

    // check if user already exists
    const existingUser = await userdb.findOne({ email });
    console.log("Existing user found:", existingUser);

    // if user exists
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // hash password
    const saltRound = 10;
    const hash_password = await bcrypt.hash(password, saltRound);

    // if user doesn't exist then create user
    if (!existingUser) {
      await userdb.create({
        username,
        email,
        password: hash_password,
        isVerified: false,
      });
    }

    // generate OTP
    const otp = generateOTP();

    // hash OTP
    const saltround = 10;
    const hash_otp = await bcrypt.hash(otp, saltround);

    // expire time (10 minutes)
    const expire_time = new Date(Date.now() + 10 * 60 * 1000);

    // delete old OTP if exists
    await otpdb.deleteMany({ email });

    // save OTP
    await otpdb.create({
      username,
      email,
      otp: hash_otp,
      num_attempts: 0,
      is_otp_used: false,
      expire_time,
    });

    // send OTP email
    await transporter.sendMail({
      from: '"mini-kubernetes" <chougulepratiksha23@gmail.com>',
      to: email,
      subject: "Email Verification OTP",
      html: `<p>Your verification code is <b>${otp}</b>. Please enter it to verify your email.</p>`,
    });

    return res.status(200).json({
      msg: "Registered successfully. OTP sent to email.",
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ msg: "error" });
  }
};

const verifyotp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otprecord = await otpdb.findOne({ email });

    if (!otprecord) {
      return res.status(404).json({ msg: "Invalid email" });
    }

    if (otprecord.expire_time < new Date()) {
      return res.status(400).json({ msg: "OTP has expired" });
    }

    const match_otp = await bcrypt.compare(otp, otprecord.otp);
    if (match_otp) {
      // mark user verified
      await userdb.updateOne({ email }, { $set: { isVerified: true } });

      await otpdb.updateOne(
        { email },
        {
          $set: { is_otp_used: true },
          $inc: { num_attempts: 1 },
        },
      );

      return res.status(200).json({ msg: "Email verified successfully" });
    } else {
      return res.status(400).json({ msg: "OTP is invalid" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userdb.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid email or password!" });
    }

    const token = await user.generateToken();

    return res.status(200).json({
      msg: "Login successful",
      token,
    });
  } catch (err) {
    console.error("LOGIN ERROR", err);
    return res.status(400).json({ msg: "error in login" });
  }
};

const create_deployment = async (req, res) => {
  try {
    const { name, image, replicas, containerPort } = req.body;

    if (!name || !image || !containerPort) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const deployment = await Deployment_db.create({
      name,
      image,
      replicas,
      containerPort,
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

const get_pod_logs = async (req, res) => {
  try {
    const pod = await pod_db.findById(req.params.podId);

    if (!pod) {
      return res.status(404).json({ message: "Pod not found" });
    }

    const deployment = await Deployment_db.findById(pod.deploymentId);
    if (deployment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({
      podId: pod._id,
      status: pod.status,
      exitCode: pod.lastExitCode,
      crashReason: pod.crashReason,
      restartCount: pod.restartCount,
      logs: pod.logs || "No logs available",
    });
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
  register,
  verifyotp,
  login,
  get_pod_logs,
};
