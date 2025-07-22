import stripe from "stripe";
import Booking from "../models/Booking.js";

// const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  console.log("⚡ Stripe webhook triggered");

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log("✅ Stripe event constructed:", event.type);
  } catch (err) {
    console.error("❌ Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Check for the event type
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata.bookingId;

    console.log("📌 Checkout complete for booking:", bookingId);

    // Update booking
    try {
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        { isPaid: true },
        { new: true }
      );
      console.log("✅ Booking updated:", booking);
    } catch (err) {
      console.error("❌ Failed to update booking:", err.message);
    }
  }

  res.status(200).json({ received: true });
};
