import { randomBytes } from "crypto";
import { createRazorPayInstance } from "../config/RazorPayInstance.js";
import { Razor_pay_secret_key } from "../config/ENV_variable.js";
import { PaymentModel } from "../models/PaymentsSchema.js";
import crypto from "crypto";
import { Users } from "../models/UserSchema.js";
const RazorPayInstance = createRazorPayInstance();

export const CreatePaymentOrderId = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        msg: "Amount is required",
        success: false,
      });
    }

    const options = {
      amount: Number(amount) * 100, 
      currency: "INR",
      receipt: randomBytes(10).toString("hex"),
    };

    const order = await RazorPayInstance.orders.create(options);


    console.log(order)
    return res.status(200).json({
      msg: "Successfully Generated OrderId",
      success: true,
      order,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
};



export const VerifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      email,
      customerId,
      amount_Paid
    } = req.body;

    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSign = crypto
      .createHmac("sha256", Razor_pay_secret_key)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({
        msg: "Invalid Payment Signature",
        success: false,
      });
    }

    const paymentDoc = await PaymentModel.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      email,
      customerId,
      amount_Paid
    });

    console.log(paymentDoc)

    return res.status(200).json({
      msg: "Payment Verified Successfully",
      success: true,
      paymentDoc,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
};


export const AddWalletMoney = async (req,res)=>{
  try{

    const {
        customerId,
        amount_Paid} = req.body;

        const User = await Users.findByIdAndUpdate(customerId , {$inc : {WalletMoney : amount_Paid}} , {new : true});
        if(!User) return res.status(400).json({msg : 'Failed To Add Money' , success : false})
return res.status(200).json({msg : 'Wallet Money Added' , success : true, WalletMoney : User.WalletMoney})
  }catch(error){
    console.log(error)
    return res.status(500).json({msg : 'Internal Server Error', success : false});
  }
}

export const FetchWalletMoney = async (req,res)=>{
 try{

    const {
        customerId,
       } = req.body;

        const User = await Users.findById(customerId);
        if(!User) return res.status(400).json({msg : 'Failed ' , success : false})
return res.status(200).json({msg : 'Wallet Money Added' , success : true, WalletMoney : User.WalletMoney})
  }catch(error){
    console.log(error)
    return res.status(500).json({msg : 'Internal Server Error', success : false});
  }
}