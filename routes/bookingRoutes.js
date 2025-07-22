import express from "express";
import {
  checkAvailabilityAPI,
  createBooking, // fixed spelling from createBoooking
  getUserBookings, // fixed from getUserBoooking
  getHotelBookings,
  stripePayment,
  downloadReceipt,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";

const bookingRouter = express.Router();

bookingRouter.post("/check-availability", checkAvailabilityAPI);
bookingRouter.post("/book", protect, createBooking);
bookingRouter.get("/user", protect, getUserBookings);
bookingRouter.get("/hotel", protect, getHotelBookings);
bookingRouter.get("/download-receipt/:id", protect, downloadReceipt);

bookingRouter.post("/stripe-payment", protect, stripePayment);

export default bookingRouter;
