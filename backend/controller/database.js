const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const DB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected ");
  } catch (error) {
    console.error("MongoDB Connection Failed ", error);
    process.exit(1);
  }
};
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { userId: this._id, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
};

const userdb = mongoose.model("User", userSchema);

const otpSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    num_attempts: {
      type: Number,
      required: true,
    },
    is_otp_used: {
      type: Boolean,
      default: false,
    },
    expire_time: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

const otpdb = mongoose.model("Otp", otpSchema);

const desired_state_schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    replicas: {
      type: Number,
      required: true,
      default: 1,
    },

    containerPort: {
      type: Number,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
    },
  },
  { timestamps: true },
);

const Deployment_db = mongoose.model("Deployment", desired_state_schema);

const podSchema = new mongoose.Schema(
  {
    deploymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deployment",
      required: true,
    },

    containerId: {
      type: String,
      required: true,
    },

    nodeId: {
      type: String,
      default: "localhost",
    },

    status: {
      type: String,
      enum: ["pending", "running", "crashed", "stopped"],
      default: "pending",
    },

    restartCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const pod_db = mongoose.model("Pod", podSchema);

module.exports = { DB, userdb, otpdb, Deployment_db, pod_db };
