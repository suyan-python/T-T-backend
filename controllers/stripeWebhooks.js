// import stripe from "stripe";
// import Booking from "../models/Booking.js";

// // const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

// export const stripeWebhooks = async (req, res) => {
//   console.log("⚡ Stripe webhook triggered");

//   const sig = req.headers["stripe-signature"];
//   const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

//     console.log("✅ Stripe event constructed:", event.type);
//   } catch (err) {
//     console.error("❌ Webhook signature verification failed.", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Check for the event type
//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;
//     const bookingId = session.metadata?.bookingId;
//     if (bookingId) {
//       await Booking.findByIdAndUpdate(bookingId, { isPaid: true });
//       console.log("✅ Booking updated from session.completed");
//     }
//   } else if (event.type === "payment_intent.succeeded") {
//     const intent = event.data.object;
//     const bookingId = intent.metadata?.bookingId;
//     if (bookingId) {
//       await Booking.findByIdAndUpdate(bookingId, { isPaid: true });
//       console.log("✅ Booking updated from payment_intent.succeeded");
//     }
//   }

//   res.status(200).json({ received: true });
// };

import stripe from "stripe";
import Booking from "../models/Booking.js";

// API to handle Stripe Webhooks
export const stripeWebhooks = async (request, response) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

  const sig = request.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const paymentIntentId = paymentIntent.id;
    // Getting Session Metadata
    const session = await stripeInstance.checkout.sessions.list({
      payment_intent: paymentIntentId,
    });

    const { bookingId } = session.data[0].metadata;
    // Mark Payment as Paid
    await Booking.findByIdAndUpdate(bookingId, {
      isPaid: true,
      paymentMethod: "Stripe",
    });
  } else {
    console.log("Unhandled event type:", event.type);
  }

  response.json({ received: true });
};
