import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * EMAIL OTP CONFIGURATION
 * 
 * To use Gmail with 2-Step Verification and App Password:
 * 1. Enable 2-Step Verification on your Google account:
 *    - Go to https://myaccount.google.com/security
 *    - Enable 2-Step Verification
 * 
 * 2. Generate an App Password:
 *    - Go to https://myaccount.google.com/apppasswords
 *    - Select "App" → "Other (Custom name)" → Enter "LMS App"
 *    - Click "Generate" and copy the 16-character password
 * 
 * 3. Add these to your .env file:
 *    - SMTP_HOST=smtp.gmail.com
 *    - SMTP_PORT=587
 *    - SMTP_USER=your-gmail@gmail.com
 *    - SMTP_PASS=your-app-password
 *    - FROM_EMAIL="LMS Platform <your-gmail@gmail.com>"
 */

// Create a test account with Ethereal for development
// This will create a free disposable email account
async function createTestAccount() {
  const testAccount = await nodemailer.createTestAccount();
  return {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  };
}

// Configure Gmail transporter
function createGmailTransporter() {
  return {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // App Password from Google
    },
  };
}

// Helper function to send via Ethereal account
async function sendWithEthereal(transporter, email, otp, userName) {
  try {
    // Email content for fallback
    const mailOptions = {
      from: '"E-Learning Platform" <test@ethereal.email>',
      to: email,
      subject: 'Email Verification',
      text: `Thank you for registering! Please use the following OTP to verify your email address:

${otp}

This OTP will expire in 10 minutes.

If you didn't request this verification, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
          <h2 style="color: #4F46E5; text-align: center;">Email Verification</h2>
          <p>Thank you for registering! Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f0f0ff; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #4F46E5;">${otp}</div>
          <p>This OTP will expire in 10 minutes.</p>
          <p style="color: #888; font-size: 14px; margin-top: 30px;">If you didn't request this verification, please ignore this email.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e4; text-align: center; color: #888; font-size: 12px;">
            <p>© ${new Date().getFullYear()} E-Learning Platform. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    if (info.messageId) {
      console.log('Fallback email sent successfully via Ethereal:', info.messageId);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error sending ethereal email fallback:', error);
    return false;
  }
}

// Send OTP via email
export const sendOTPViaEmail = async (email, otp, userName) => {
  try {
    console.log('Attempting to send email to:', email);
    console.log('Using SMTP credentials:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS ? '******' : 'not set'
    });
    
    // Get SMTP config, either from .env or create a test account
    let transportConfig;
    
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Use configured SMTP server - Using Gmail-specific configuration
      if (process.env.SMTP_HOST === 'smtp.gmail.com') {
        transportConfig = {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        };
        console.log('Using Gmail service for email delivery');
      } else {
        transportConfig = {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false,
            ciphers: "SSLv3"
          }
        };
        console.log('Using configured SMTP server:', process.env.SMTP_HOST);
      }
    } else {
      // Create a test ethereal account (free and disposable)
      console.log('No SMTP configuration found, using Ethereal test account');
      transportConfig = await createTestAccount();
    }

    // Create transporter
    const transporter = nodemailer.createTransport(transportConfig);
    
    // Verify connection configuration
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP connection verification failed:', verifyError);
      // Fallback to ethereal if verification fails
      console.log('Fallback to Ethereal test account');
      transportConfig = await createTestAccount();
      const newTransporter = nodemailer.createTransport(transportConfig);
      return await sendWithEthereal(newTransporter, email, otp, userName);
    }

    // Email content with improved design that matches the example
    const mailOptions = {
      from: process.env.FROM_EMAIL || `"E-Learning Platform" <${transportConfig.auth.user}>`,
      to: email,
      subject: 'Email Verification',
      text: `Thank you for registering! Please use the following OTP to verify your email address:

${otp}

This OTP will expire in 10 minutes.

If you didn't request this verification, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
          <h2 style="color: #4F46E5; text-align: center;">Email Verification</h2>
          <p>Thank you for registering! Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f0f0ff; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #4F46E5;">${otp}</div>
          <p>This OTP will expire in 10 minutes.</p>
          <p style="color: #888; font-size: 14px; margin-top: 30px;">If you didn't request this verification, please ignore this email.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e4; text-align: center; color: #888; font-size: 12px;">
            <p>© ${new Date().getFullYear()} E-Learning Platform. All rights reserved.</p>
          </div>
        </div>
      `
    };

    // Send email
    console.log('Sending email with the following options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    
    // Show preview URL in development
    if (info.messageId) {
      console.log('Email sent successfully:', info.messageId);
      // Preview URL for Ethereal emails
      if (info.testMessageUrl) {
        console.log('Preview URL:', info.testMessageUrl);
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}; 