require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const projectRoutes = require("./routes/projects");
const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");
const errorHandler = require("./middleware/error");
const path = require("path");
const uploadRoutes = require("./routes/upload");
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware woking files
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/projects", projectRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/categories", require("./routes/categories"));
app.use("/api/programs", require("./routes/programs"));
app.use("/api/users", require("./routes/users"));
app.use("/api/reports", reportRoutes);
app.use("/api/upload", uploadRoutes);

// Root Endpoint
app.get("/", (req, res) => {
  res.send("Project Tracking API is running...");
});

// error handler middleware
app.use(errorHandler);
// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    // Start Server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error.message);
  });
