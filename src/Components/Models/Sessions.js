import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // token: { type: String, required: true },
  // createdAt: { type: Date, default: Date.now },
  // expiresAt: { type: Date, required: true },
  loginTime: { type: Date },
  logoutTime: { type: Date },
});

const Session =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);

export default Session;
