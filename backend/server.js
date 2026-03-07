require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { DB } = require("./controller/database");
const authRoutes = require("./routes/authentication-route");
const app = express();
DB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.get("/", (req, res) => {
  res.json({ message: "Mini Kubernetes is Running " });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
