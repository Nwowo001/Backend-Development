import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  loginTime: { type: Date },
  logoutTime: { type: Date },
  sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Session" }],
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
