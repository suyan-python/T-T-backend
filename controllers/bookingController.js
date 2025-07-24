import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import Hotel from "../models/Hotel.js";
import transporter from "../configs/nodemailer.js";
import stripe from "stripe";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// Function to check availability of a room between dates
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
  try {
    // Convert input dates to Date objects and normalize times to start/end of day
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0); // start of check-in day

    const checkOut = new Date(checkOutDate);
    checkOut.setHours(23, 59, 59, 999); // end of check-out day

    // Query bookings where existing booking overlaps with requested dates
    const bookings = await Booking.find({
      room,
      checkInDate: { $lt: checkOut }, // existing booking starts before requested check-out
      checkOutDate: { $gt: checkIn }, // existing booking ends after requested check-in
    });

    console.log("Found conflicting bookings:", bookings);

    return bookings.length === 0;
  } catch (error) {
    console.error("Availability check error:", error.message);
    return false;
  }
};

// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate } = req.body;
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });
    res.json({ success: true, isAvailable });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// POST /api/bookings/book
export const createBooking = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate, guests, totalPrice } = req.body;
    const user = req.user._id;

    // Use fixed availability check
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });
    if (!isAvailable) {
      return res.json({ success: false, message: "Room is not available" });
    }

    const roomData = await Room.findById(room).populate("hotel");
    if (!roomData || !roomData.hotel) {
      return res.json({ success: false, message: "Room or Hotel not found" });
    }

    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(checkOutDate);
    checkOut.setHours(23, 59, 59, 999);

    const timeDiff = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    // Optional: Add a fallback or simple validation
    const finalPrice = totalPrice || roomData.pricePerNight * guests;

    const booking = await Booking.create({
      user,
      room,
      hotel: roomData.hotel._id,
      guests: +guests,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalPrice: finalPrice,
      status: "pending",
      paymentMethod: "Pay At Hotel",
      isPaid: false,
    });

    const expectedPrice = roomData.pricePerNight * guests; // or include nights if needed

    if (totalPrice !== expectedPrice) {
      return res.json({ success: false, message: "Invalid total price" });
    }

    // Sending email notification (ensure transporter is configured and uncommented)

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: req.user.email,
      subject: "Your Booking Confirmation - TOURS & TRAVELS",
      html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 24px; border-radius: 8px;">
      <img src="https://toursandtravelsnepal.netlify.app/logo1.png" alt="Logo" style="width: 120px; margin-bottom: 24px;" />

      <h2 style="color: #dc143c;">Your Booking Confirmation</h2>

      <p>Dear <strong>${req.user.username}</strong>,</p>
      <p>Thank you for booking with <strong>Tours & Travels</strong>! Here are your booking details:</p>

      <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
        <tr>
          <td><strong>Package Name:</strong></td>
          <td>${roomData.packageName}</td>
        </tr>
        <tr>
          <td><strong>Booking ID:</strong></td>
          <td>${booking._id}</td>
        </tr>
        <tr>
          <td><strong>Agency Name:</strong></td>
          <td>${roomData.hotel.name}</td>
        </tr>
        <tr>
          <td><strong>Location:</strong></td>
          <td>${roomData.hotel.address}</td>
        </tr>
        <tr>
          <td><strong>Check-In Date:</strong></td>
          <td>${checkIn.toDateString()}</td>
        </tr>
        <tr>
          <td><strong>Check-Out Date:</strong></td>
          <td>${checkOut.toDateString()}</td>
        </tr>
        <tr>
          <td><strong>Total Amount:</strong></td>
          <td>${process.env.CURRENCY || "$"} ${booking.totalPrice}</td>
        </tr>
      </table>

      <p style="margin-top: 24px;">We look forward to welcoming you. If you need to make any changes, feel free to reach out to us.</p>
      <p style="margin-top: 24px; font-size: 12px; color: #777;">© ${new Date().getFullYear()} Tours & Travels. All rights reserved.</p>
    </div>
  `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.log("Booking creation error:", error);
    res.json({ success: false, message: "Failed to create Booking" });
  }
};

export const downloadReceipt = async (req, res) => {
  const bookingId = req.params.id;

  try {
    const booking = await Booking.findById(bookingId)
      .populate("room")
      .populate("hotel")
      .populate("user");

    if (!booking) return res.status(404).send("Booking not found");

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set headers BEFORE piping
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${bookingId}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Optional: check logo exists
    const logoPath = path.join(process.cwd(), "public", "logo1.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 30, { width: 100 });
    }

    doc.moveDown(2).fontSize(18).text("Booking Receipt", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Booking ID: ${booking._id}`);
    doc.text(`Name: ${booking.user.username}`);
    doc.text(`Email: ${booking.user.email}`);
    doc.text(`Package Name: ${booking.room.packageName}`);
    doc.text(`Hotel Name: ${booking.hotel.name}`);
    doc.text(`Hotel Address: ${booking.hotel.address}`);
    doc.text(`Check-In: ${new Date(booking.checkInDate).toDateString()}`);
    doc.text(`Check-Out: ${new Date(booking.checkOutDate).toDateString()}`);
    doc.text(`Guests: ${booking.guests}`);
    doc.text(`Total Price: Rs. ${booking.totalPrice}`);
    doc.text(`Status: ${booking.status}`);
    doc.text(`Payment Method: ${booking.paymentMethod}`);
    doc.text(`Payment Status: ${booking.isPaid ? "Paid" : "Payment Pending"}`);

    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
    if (!res.headersSent) {
      res.status(500).send("Error generating receipt");
    }
  }
};

// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
  try {
    const user = req.user._id;
    const bookings = await Booking.find({ user })
      .populate("room hotel")
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};

// GET /api/bookings/hotel
export const getHotelBookings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.auth.userId });
    if (!hotel) {
      return res.json({ success: false, message: "No hotel found" });
    }

    const bookings = await Booking.find({ hotel: hotel._id })
      .populate("room hotel user")
      .sort({ createdAt: -1 });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce(
      (acc, booking) => acc + booking.totalPrice,
      0
    );

    res.json({
      success: true,
      dashboardData: { totalBookings, totalRevenue, bookings },
    });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};

export const stripePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    const roomData = await Room.findById(booking.room).populate("hotel");
    const totalPrice = booking.totalPrice;
    const { origin } = req.headers;

    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const line_items = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: roomData.packageName,
          },
          unit_amount: booking.totalPrice * 100,
        },
        quantity: 1,
      },
    ];

    // Create Checkout Session
    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata: {
        bookingId: bookingId,
      },
      metadata: {
        bookingId: bookingId, // ✅ also add here just in case
      },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    res.json({ success: false, message: "Payment Failed" });
  }
};
