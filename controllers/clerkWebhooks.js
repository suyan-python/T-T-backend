import User from "../models/User.js";
import { Webhook } from "svix";

const clerkWebhooks = async (req, res) => {
  try {
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    // Verify the webhook signature
    await whook.verify(JSON.stringify(req.body), headers);

    // Convert raw buffer to JSON
    // const parsedBody = JSON.parse(req.body.toString());
    // const { data, type } = parsedBody;
    const { data, type } = req.body;

    console.log("📩 Clerk Webhook Received:");
    console.log("Event Type:", type);
    console.log("User ID:", data?.id);

    // Construct user data safely

    const userData = {
      _id: data.id,
      email: data.email_addresses[0].email_address,
      username: data.first_name + " " + data.last_name,
      image: data.image_url,
    };

    switch (type) {
      // case "user.created": {
      //   //        const userData = {
      //   //   _id: data.id,
      //   //   email: data.email_addresses[0].email_address ,
      //   //   username:data.first_name + " " + data.last_name,
      //   //   image: data.image_url ,
      //   //   recentSearchedCities: [],
      //   // }

      //   //  await User.create(userData)
      //   const exists = await User.findById(data.id);
      //   if (!exists) {
      //     await User.create(userData);
      //   }

      //   break;
      // }

      case "user.created": {
        await User.create(userData);
        break;
      }

      case "user.updated": {
        await User.findByIdAndUpdate(data.id, userData);
        break;
      }

      // case "user.created": {
      //   const existingUser = await User.findById(data.id);
      //   if (!existingUser) {
      //     await User.create(userData);
      //   } else {
      //     console.log("User already exists. Skipping creation.");
      //   }
      //   break;
      // }

      case "user.deleted": {
        await User.findByIdAndDelete(data.id);
        break;
      }

      default:
        break;
    }
    res.json({ success: true, message: "Webhook Received" });
  } catch (error) {
    // console.log(error.message);
    console.error("Webhook error:", error);

    res.json({ success: false, message: error.message });
  }
};

export default clerkWebhooks;
