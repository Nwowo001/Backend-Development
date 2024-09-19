import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:5000/logout",
        {},
        { withCredentials: true }
      );
      localStorage.removeItem("userToken");
      navigate("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="navbar">
      <ul className="navbar-list">
        <li className="navbar-item" onClick={() => navigate("/home")}>
          Home
        </li>
        <li className="navbar-item" onClick={() => navigate("/about")}>
          About
        </li>
        <button className="navbar-item" onClick={handleLogout}>
          Logout
        </button>
      </ul>
    </nav>
  );
};

export default Navbar;
