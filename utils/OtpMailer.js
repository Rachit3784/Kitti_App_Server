import sgMail from "@sendgrid/mail";
import { Email, SendgridApiKey } from '../config/ENV_variable.js';

// Initialize SendGrid with your API Key
sgMail.setApiKey(SendgridApiKey);
// sgMail.setDataResidency('eu');
export const SendOtpToUser = async (data) => {
  const mailOptions = {
    to: data.userEmail,
    from: Email, // Ensure this variable contains the exact email verified in your SendGrid dashboard
    subject: 'OTP To Register As Admin',
    text: String(data.otp), // Good practice to cast to string in case OTP is sent as a number
    html: data.HTML,
  };



  try {
    await sgMail.send(mailOptions);
    console.log('Email sent successfully');
    return true;
  } catch (error) {
    console.error('SendGrid Error:', error);
    if (error.response) {
      console.error(error.response.body); // This gives you the specific reason SendGrid rejected it
    }
    return false;
  }
};