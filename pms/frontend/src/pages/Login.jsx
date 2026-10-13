import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useQueryClient } from "@tanstack/react-query";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const queryClient = useQueryClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const success = await login(email.toLocaleLowerCase(), password);
    if (success) {
      queryClient.clear();
      navigate("/");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div
      className="app-container"
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#231d48ff",
      }}
    >
      <div className="glass-panel" style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            alt="Auth Logo"
            width="150"
            class=" "
            src="https://dev.smart-life.sa/assets/smartlife-text-black-THaafVXq.png"
          />
          <p>Login to your PMS Pro account</p>
        </div>

        {error && (
          <div
            style={{
              color: "#ef4444",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: "3rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: 4,
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            {/* <Link
              to="/forgotpassword"
              style={{ color: "var(--primary-color)", textDecoration: "none" }}
            >
              Forgot Password?
            </Link> */}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
