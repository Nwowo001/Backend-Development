import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool } from "./dbConfig.js";

dotenv.config();

const app = express();
const PORT = 5000;

const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(cookieParser());
app.use(helmet());

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

const verifyJWT = async (req, res, next) => {
  const token = req.cookies.token;
  console.log("Token received:", token);
  if (!token) return res.status(403).json({ error: "No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      decoded.userId,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "User does not exist." });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      const newToken = jwt.sign(
        { userId: decoded.userId },
        process.env.JWT_KEY,
        { expiresIn: "1h" }
      );
      res.cookie("token", newToken, { httpOnly: true, secure: isProduction });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ error: "Invalid token. Please log in again." });
  }
};

app.get("/api/heartbeat", verifyJWT, (req, res) => {
  res.status(200).json({ message: "User is still active." });
});

app.post("/sign-up", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }

  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordPattern.test(password)) {
    return res.status(400).json({
      error:
        "Password must be at least 6 characters long and include both letters and numbers.",
    });
  }

  try {
    const userCheckResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (userCheckResult.rows.length > 0) {
      return res.status(400).json({ error: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: "Account created successfully." });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Internal Server Error." });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true, secure: isProduction });

    res.status(200).json({ message: "Login successful." });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Internal Server Error." });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logout successful." });
});

app.post("/refresh-token", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(403).json({ error: "No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    const newToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });

    res.cookie("token", newToken, { httpOnly: true, secure: isProduction });
    res.status(200).json({ message: "Token refreshed." });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({ error: "Invalid or expired token." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
