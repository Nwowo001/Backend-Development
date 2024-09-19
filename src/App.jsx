import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Signin from "./Components/Login/Signin";
import Navbar from "./Components/Navbar/Navbar";
import ProtectedRoute from "./Components/Protected routes/ProtectedRoute";
import About from "./Components/Pages/about";
import axios from "axios";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(null);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:5000"
          }/api/heartbeat`,
          {
            withCredentials: true,
          }
        );
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/home" />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />

        <Route
          path="/signin"
          element={isAuthenticated ? <Navigate to="/home" /> : <Signin />}
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Navbar />
              <div>Home Content</div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/about"
          element={
            <ProtectedRoute>
              <Navbar />
              <About />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
