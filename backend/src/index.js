const express  = require("express");
const cors     = require("cors");
require("dotenv").config();

require("./keepalive");
const usersRouter = require("./routes/users");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://neon-taffy-e95a1c.netlify.app",
  "https://marelimanagementsystem.netlify.app",
  "https://mareli-school.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok", env: process.env.NODE_ENV }));
app.use("/api/users", usersRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
