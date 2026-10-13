const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized to access this route" });
  }

  try {
    // Verify token and extract embedded claims
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB (for up-to-date data), then override with token claims
    const dbUser = await User.findById(decoded.id);
    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user to request — prefer token claims for email & role
    req.user = {
      ...dbUser.toObject(),
      email: decoded.email || dbUser.email,
      role: decoded.role || dbUser.role,
    };

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Not authorized to access this route" });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
