import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    phone_number: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        sparse: true,  // Allow multiple users with null email
        index: true,   // Index for faster lookups
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["USER", "ADMIN", "INSTRUCTOR"],
        default: "USER",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    refreshToken: String,
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
    }],
    photoUrl:{
        type:String,
        default:""
    },
    otp: {
        code: {
            type: String,
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        }
    },
    // OTP delivery preferences
    otpDelivery: {
        // Array of preferred delivery methods in order of preference
        methods: {
            type: [String],
            enum: ["sms", "email", "whatsapp", "console"],
            default: ["sms", "email", "console"]
        }
    }
},{timestamps:true});

// Validate phone number - support Indian phone numbers in E.164 format
userSchema.path('phone_number').validate(function(phone) {
    // Valid formats: +91XXXXXXXXXX
    // The validation allows +91 followed by a 10-digit number starting with 6-9
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    return phoneRegex.test(phone);
}, 'Please provide a valid Indian phone number in format +91XXXXXXXXXX');

// Validate email format if provided
userSchema.path('email').validate(function(email) {
    if (!email) return true; // Allow null/empty emails
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}, 'Please provide a valid email address');

export const User = mongoose.model("User", userSchema);