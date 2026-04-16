import axios from "axios";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import dotenv from "dotenv";
dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Place order and initialize Paystack payment (Kenya)
const placeOrder = async (req, res) => {
const frontend_url = process.env.FRONTEND_URL;

  try {
    // Validate required data
    const { userId, email, items, amount, address } = req.body;
    if (!userId || !email || !items || !amount || !address) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    //Save order
    const newOrder = new orderModel({ userId, items, amount, address });
    await newOrder.save();

    //Clear user's cart
    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    //Initialize payment with Paystack
   const response = await axios.post(
  "https://api.paystack.co/transaction/initialize",
  {
    email,
    amount: amount * 100, // Paystack uses kobo-like units
    currency: "KES",
    reference: newOrder._id.toString(),
    callback_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`, 
    channels: ["card", "mobile_money" ], // M-Pesa & card
  },
  {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  }
);


    //Send Paystack authorization link back to frontend
    res.json({
      success: true,
      authorization_url: response.data.data.authorization_url,
    });
  } catch (error) {
    console.error("Paystack init error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Payment initialization failed" });
  }
};
// Verify order payment
const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;
  console.log("VERIFY REQUEST BODY:", req.body);

  try {
    if (!orderId) {
      console.log(" Missing orderId");
      return res.status(400).json({ success: false, message: "Missing orderId" });
    }

    if (success === "true" || success === true) {
      console.log(" Payment success detected for order:", orderId);
      const updatedOrder = await orderModel.findByIdAndUpdate(
        orderId,
        { payment: true },
        { new: true }
      );
      console.log("Updated order result:", updatedOrder);

      if (!updatedOrder) {
        console.log(" Order not found in DB");
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      console.log(" Payment failed, deleting order:", orderId);
      await orderModel.findByIdAndDelete(orderId);
      return res.json({ success: false, message: "Payment failed, order deleted" });
    }
  } catch (error) {
    console.error("Error verifying order:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



// user order for frontend
const userOrders = async (req,res) =>{
 try {
  const orders = await orderModel.find({userId:req.body.userId})
  res.json({success:true,data:orders})
 } catch (error) {
   console.log(error);
   res.json({success:false,message:"Error"})
 }
}

// Listing all orders for admin
const listOrders = async (req, res) => {
  try {
    const orders = await orderModel.find();
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching orders" });
  }
};

// api for updating order status
const updateStatus = async (req,res) =>{
  try {
    await orderModel.findByIdAndUpdate(req.body.orderId,{status:req.body.status});
    res.json({success:true, message:"Status Updated"});
  } catch (error) {
    console.log(error);
    res.json({success:false, message: "Could not update status"});
  }
}



export {placeOrder, verifyOrder, userOrders, listOrders, updateStatus}; 
