import Hotel from "../models/Hotel.js";
import User from "../models/User.js";

export const registerHotel = async (req, res) => {
  try {
    const { name, address, contact, city } = req.body;
    const owner = req.user._id
  
    // Check if the user already registered
    const hotel = await Hotel.findOne({ owner })
    if (hotel) {
      return res.json({ success: false, message: "Hotel Already Registered" })
    }

    await Hotel.create({ name, address, contact, city, owner });

    
    await User.findByIdAndUpdate(owner, { role: "hotelOwner" }); // role string should match your enum in schema

    res.json({ success: true, message: "Hotel Registered Successfully" })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// import Hotel from "../models/Hotel.js";
// import User from "../models/User.js";

// export const registerHotel = async (req, res) => {
//   try {
//     console.log("✅ registerHotel endpoint hit");

//     const { name, address, contact, city } = req.body;
//     const owner = req.user._id;

//     console.log("User:", req.user);
//     console.log("Hotel Data:", req.body);

//     // Check if user already owns a hotel
//     const hotel = await Hotel.findOne({ owner });
//     if (hotel) {
//       return res.status(400).json({ success: false, message: "Hotel Already Registered" });
//     }

//     await Hotel.create({ name, address, contact, city, owner });

//     // Update user role exactly as per enum
//     await User.findByIdAndUpdate(owner, { role: "hotelOwner" });

//     res.status(201).json({ success: true, message: "Hotel Registered Successfully" });
//   } catch (error) {
//     console.error("registerHotel error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
