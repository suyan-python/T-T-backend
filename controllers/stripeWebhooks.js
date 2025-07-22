import stripe from "stripe";
import Booking from "../models/Booking.js";

// Initialize stripe only once (optional: move to global config)
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️  Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Recommended event: checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata.bookingId;

    await Booking.findByIdAndUpdate(bookingId, {
      isPaid: true,
      status: "confirmed",
    });
  }

  response.json({ received: true });
};
