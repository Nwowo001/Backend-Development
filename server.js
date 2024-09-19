import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import User from "./src/Components/Models/User.js";
import Session from "./src/Components/Models/Sessions.js";
import dotenv from "dotenv";
dotenv.config();

const mongoURI = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.tus1j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

try {
  await mongoose.connect(mongoURI);
  console.log("Connected to MongoDB");
} catch (err) {
  console.error("MongoDB connection error:", err);
}

const app = express();
const PORT = 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

app.use("/login", limiter);
app.use("/sign-up", limiter);

const verifyJWT = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(403).json({ error: "No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findById(decoded.userId);

    // Check if the user was active in the last 30 minutes
    const currentTime = Date.now();
    const lastActiveTime = new Date(user.lastActivity).getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (currentTime - lastActiveTime > thirtyMinutes) {
      return res
        .status(401)
        .json({ error: "Session expired. Please log in again." });
    }

    // Refresh the token if expired
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      const newToken = jwt.sign(
        { username: decoded.username, userId: decoded.userId },
        process.env.JWT_KEY,
        { expiresIn: "1h" }
      );

      res.cookie("token", newToken, {
        httpOnly: true,
        maxAge: 3600000,
        secure: process.env.NODE_ENV === "production",
      });

      console.log("Token refreshed for active user:", decoded.username);
    }

    await User.findByIdAndUpdate(decoded.userId, { lastActivity: new Date() });
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token. Please log in again." });
  }
};

app.get("/api/heartbeat", verifyJWT, (req, res) => {
  res.status(200).json({ message: "User is still active." });
});

app.post("/sign-up", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Please fill in all fields" });
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordPattern.test(password))
      return res.status(400).json({
        error:
          "Password must be at least 6 characters long and include both letters and numbers",
      });
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Please fill in all fields" });
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid email or password" });
    const token = jwt.sign(
      { username: user.name, userId: user._id },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 3600000,
      secure: process.env.NODE_ENV === "production",
    });
    user.lastActivity = new Date();
    await user.save();
    res.json({ message: "Login successful" });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/logout", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const session = new Session({
        userId: decoded.userId,
        logoutTime: new Date(),
      });
      await session.save();
    }
    res.clearCookie("token");
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/refresh-token", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(403).json({ error: "No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const newToken = jwt.sign(
      { username: decoded.username, userId: decoded.userId },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
    res.cookie("token", newToken, {
      httpOnly: true,
      maxAge: 3600000,
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ message: "Token refreshed" });
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
