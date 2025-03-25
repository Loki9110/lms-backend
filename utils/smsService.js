import twilio from 'twilio';
import dotenv from 'dotenv';
import { sendOTPViaEmail } from './emailOTP.js';

dotenv.config();

// Check if required Twilio environment variables are properly set
const isTwilioConfigured = 
    process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid' &&
    process.env.TWILIO_ACCOUNT_SID !== 'AC1234youraccountsidhere' &&
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_AUTH_TOKEN !== 'your_auth_token' &&
    process.env.TWILIO_AUTH_TOKEN !== 'your1234authtoken1234here' &&
    process.env.TWILIO_PHONE_NUMBER && 
    process.env.TWILIO_PHONE_NUMBER !== 'your_twilio_phone_number' &&
    process.env.TWILIO_PHONE_NUMBER !== '+1234567890';

// Create Twilio client only if properly configured
let client = null;
if (isTwilioConfigured) {
    try {
        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('Twilio client initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Twilio client:', error);
    }
}

export const sendSMSOTP = async (phoneNumber, otp, email = null, userName = null) => {
    console.log('Attempting to send OTP to:', phoneNumber);
    
    // Always show OTP in console (most reliable method for development)
    displayOTPInConsole(phoneNumber, otp, email);
    
    // Delivery status tracking
    let deliveryMethods = {
        console: true,
        sms: false,
        email: false,
        whatsapp: false
    };
    
    // Try email first if available - this is now the preferred method
    if (email) {
        const emailSent = await sendOTPViaEmail(email, otp, userName);
        deliveryMethods.email = emailSent;
        
        if (emailSent) {
            console.log(`OTP email sent to: ${email}`);
        } else {
            console.log(`Failed to send OTP email to: ${email}`);
        }
    }
    
    // Try SMS only if email failed or ALWAYS_SEND_SMS is true
    if (isTwilioConfigured && (!deliveryMethods.email || process.env.ALWAYS_SEND_SMS === 'true')) {
        try {
            const message = await client.messages.create({
                body: `Your verification code for E-Learning Platform is: ${otp}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });
            
            console.log('SMS sent successfully:', message.sid);
            deliveryMethods.sms = true;
        } catch (error) {
            console.error('Error sending SMS:', error);
            logSMSError(error);
        }
    } else if (!isTwilioConfigured && !deliveryMethods.email) {
        console.log('------------------------------------------------------');
        console.log(`⚠️ TWILIO NOT CONFIGURED: SMS NOT ACTUALLY SENT`);
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`🔐 OTP: ${otp}`);
        console.log('------------------------------------------------------');
        console.log(`To send real SMS, please configure Twilio credentials in .env file`);
    }
    
    // Log delivery status
    console.log('OTP delivery status:', deliveryMethods);
    
    // Return true if at least one delivery method worked
    return deliveryMethods.console || deliveryMethods.sms || deliveryMethods.email;
};

// Helper function to display OTP in the console
function displayOTPInConsole(phoneNumber, otp, email = null) {
    if (process.env.SHOW_OTP_IN_CONSOLE === 'true') {
        console.log('\n\n');
        console.log('************************************************************');
        console.log('*                                                          *');
        console.log('*  OTP VERIFICATION CODE (USE THIS FOR TESTING):           *');
        console.log(`*  📲 PHONE: ${phoneNumber.padEnd(42, ' ')}*`);
        if (email) {
            console.log(`*  📧 EMAIL: ${email.padEnd(42, ' ')}*`);
        }
        console.log(`*  🔑 OTP CODE: ${otp.padEnd(40, ' ')}*`);
        console.log('*                                                          *');
        console.log('************************************************************');
        console.log('\n\n');
    }
}

// Helper function to log SMS error details
function logSMSError(error) {
    if (error.code === 21211) {
        console.error('Invalid phone number format. Should be in E.164 format.');
    } else if (error.code === 21608) {
        console.error('The phone number is unverified. You need to verify it in your Twilio account.');
    } else if (error.code === 21614) {
        console.error('Invalid sending phone number. Check your Twilio phone number.');
    }
}

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}; 