import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Signin.css";

const Signin = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLogin, setIsLogin] = useState(false); // Toggle between login and signup
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateForm = () => {
    const newErrors = {};
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

    if (!isLogin && !formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password && !passwordPattern.test(formData.password)) {
      newErrors.password =
        "Password must be at least 6 characters long and contain both letters and numbers";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      const endpoint = isLogin ? "/login" : "/sign-up"; // Toggle between sign-up and login
      try {
        const response = await axios.post(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:5000"
          }${endpoint}`,
          formData,
          { withCredentials: true }
        );

        if (response.status === 201) {
          if (!isLogin) {
            // Successful sign-up, switch to login interface
            setIsLogin(true);
            setFormData({ name: "", email: "", password: "" });
          }
        } else if (response.status === 200) {
          // Successful login, redirect to home
          navigate("/home");
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        setErrors({
          server: error.response?.data?.error || "An error occurred",
        });
      }
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-form">
        <h1 className="signin-heading">{isLogin ? "Login" : "Sign Up"}</h1>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`form-input ${errors.name ? "error-border" : ""}`}
              />
              {errors.name && (
                <div className="error-message">{errors.name}</div>
              )}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? "error-border" : ""}`}
            />
            {errors.email && (
              <div className="error-message">{errors.email}</div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`form-input ${errors.password ? "error-border" : ""}`}
            />
            {errors.password && (
              <div className="error-message">{errors.password}</div>
            )}
          </div>
          {errors.server && (
            <div className="error-message server-error">{errors.server}</div>
          )}
          <button type="submit" className="submit-button">
            {isLogin ? "Login" : "Sign Up"}
          </button>
          {isLogin ? (
            <div className="signup-prompt">
              Do not have an account?{" "}
              <button
                type="button"
                className="signup-link"
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="login-prompt">
              Already have an account?{" "}
              <button
                type="button"
                className="login-link"
                onClick={() => setIsLogin(true)}
              >
                Login
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Signin;
