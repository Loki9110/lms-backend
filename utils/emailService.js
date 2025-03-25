import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'sakethphaneendra@gmail.com',
        pass: 'ldezdibdkbzxaacn' // Using the EMAIL_PASSWORD from .env
    }
});

// Verify transporter connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('Server is ready to take our messages');
    }
});

export const sendOTPEmail = async (email, otp) => {
    console.log('Attempting to send email to:', email);
    console.log('Using OTP:', otp);
    
    const mailOptions = {
        from: '"E-Learning Platform" <sakethphaneendra@gmail.com>',
        to: email,
        subject: 'Email Verification OTP',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Email Verification</h2>
                <p style="color: #666; font-size: 16px;">Thank you for registering! Please use the following OTP to verify your email address:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #007bff; margin: 0; letter-spacing: 5px;">${otp}</h1>
                </div>
                <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
                <p style="color: #999; font-size: 12px;">If you didn't request this verification, please ignore this email.</p>
            </div>
        `
    };

    try {
        console.log('Sending email with transporter...');
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        return true;
    } catch (error) {
        console.error('Detailed error sending email:', error);
        if (error.response) {
            console.error('SMTP Response:', error.response);
        }
        return false;
    }
};

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}; 