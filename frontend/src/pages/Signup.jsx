import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import "./Auth.css";

const API_URL = "https://peerhelp-s3gw.onrender.com/api";

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const existingToken = sessionStorage.getItem("token");
  const existingRole = sessionStorage.getItem("userRole");

  useEffect(() => {
    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedUsername) {
      setUsernameStatus("");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      setUsernameStatus(
        "Username must be 3-20 characters: letters, numbers, or underscores",
      );
      return;
    }

    setUsernameStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_URL}/auth/check-username?username=${encodeURIComponent(
            normalizedUsername,
          )}`,
        );

        setUsernameStatus(res.data.available ? "available" : "taken");
      } catch (err) {
        console.error("Error checking username:", err);
        setUsernameStatus("error");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  if (existingToken) {
    navigate(existingRole === "mentor" ? "/mentor" : "/student", {
      replace: true,
    });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedUsername = username.trim().toLowerCase();

      if (usernameStatus !== "available") {
        setError("Please choose an available username.");
        setLoading(false);
        return;
      }

      const res = await axios.post(`${API_URL}/auth/signup`, {
        name,
        username: normalizedUsername,
        email,
        password,
        role,
      });
      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("userId", res.data.user.id);
      sessionStorage.setItem("userName", res.data.user.name);
      sessionStorage.setItem("userUsername", res.data.user.username);
      sessionStorage.setItem("userRole", res.data.user.role);
      navigate(res.data.user.role === "mentor" ? "/mentor" : "/student");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1>Create your account</h1>
        <p className="auth-subtitle">
          Join PeerHelp and start learning together.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />

          <label>Username</label>

          <div className="username-input-wrapper">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Choose a username"
              maxLength={20}
              required
            />

            {usernameStatus === "checking" && (
              <span className="username-status checking">Checking...</span>
            )}

            {usernameStatus === "available" && (
              <span className="username-status available">✓ Available</span>
            )}

            {usernameStatus === "taken" && (
              <span className="username-status taken">✕ Username taken</span>
            )}
          </div>

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
          />

          <label>I am a</label>
          <div className="role-toggle">
            <button
              type="button"
              className={
                role === "student" ? "role-option active" : "role-option"
              }
              onClick={() => setRole("student")}
            >
              Student
            </button>
            <button
              type="button"
              className={
                role === "mentor" ? "role-option active" : "role-option"
              }
              onClick={() => setRole("mentor")}
            >
              Mentor
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default Signup;
