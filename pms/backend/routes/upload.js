const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/auth");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Unique file name with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
  },
});

// Upload single file endpoint
router.post("/", protect, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({
      message: "File uploaded successfully",
      url: fileUrl,
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "File upload failed" });
  }
});

// Serve a stored file.
// Lives under /api so it goes through the same proxy as every other API call
// (the bare /uploads static path is often not proxied in production).
// PDFs open inline in the browser; every other format is sent as a download
// using the original file name (?name=...).
const buildContentDisposition = (type, fileName) => {
  const asciiName = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  return `${type}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

router.get("/files/:filename", (req, res) => {
  // basename() strips any "../" so only files inside uploadDir can be served
  const storedName = path.basename(req.params.filename || "");
  const filePath = path.join(uploadDir, storedName);

  if (!storedName || !fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  const requestedName =
    typeof req.query.name === "string" && req.query.name.trim()
      ? path.basename(req.query.name.trim())
      : storedName;

  const isPdf = path.extname(storedName).toLowerCase() === ".pdf";

  res.type(path.extname(storedName) || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    buildContentDisposition(isPdf ? "inline" : "attachment", requestedName),
  );
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ message: "Could not read file" });
    }
  });
});

module.exports = router;
