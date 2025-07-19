import express from "express";
import "dotenv/config";
import cors from "cors";
import bodyParser from "body-parser";
import connectDB from "./configs/db.js";
import { clerkMiddleware } from "@clerk/express";
import clerkWebhooks from "./controllers/clerkWebhooks.js";
import userRouter from "./routes/userRoutes.js";
import hotelRouter from "./routes/hotelRoutes.js";
import connectCloudinary from "./configs/cloudinary.js";
import roomRouter from "./routes/roomRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import { stripeWebhooks } from "./controllers/stripeWebhooks.js";

connectDB();
connectCloudinary();

const app = express();
app.use(cors());

// 👉 Apply raw body parser ONLY for Clerk Webhook
// app.use(
//   "/api/clerk",
//   bodyParser.raw({ type: "application/json" }),
//   clerkWebhooks
// );

app.use(
  "/api/clerk",
  bodyParser.raw({ type: "application/json" }),
  clerkWebhooks
);

// 👉 Now apply global middleware
app.use(express.json());
app.use(clerkMiddleware());

// Other routes
app.use("/api/user", userRouter);
app.use("/api/hotels", hotelRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/bookings", bookingRouter);

app.get("/", (req, res) => {
  res.send("API is working");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
