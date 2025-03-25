import {User} from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";
import { generateOTP, sendSMSOTP } from "../utils/smsService.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export const register = async (req,res) => {
    try {
        console.log('Registration attempt - Full request body:', { 
            ...req.body, 
            password: req.body.password ? '[HIDDEN]' : undefined 
        });
        
        const {name, phone_number, password, email} = req.body;
        console.log('Extracted registration data:', {
            name: name || 'not provided',
            phone_number: phone_number || 'not provided',
            email: email || 'not provided',
            passwordProvided: !!password
        });

        if(!name || !phone_number || !password){
            console.log('Missing required fields:', {
                name: !name,
                phone_number: !phone_number,
                password: !password
            });
            return res.status(400).json({
                success:false,
                message:"All fields are required."
            })
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,50}$/;
        if (!passwordRegex.test(password)) {
            console.log('Password validation failed');
            return res.status(400).json({
                success: false,
                message: "Password must be 8-50 characters and include at least one uppercase letter, lowercase letter, number, and special character."
            });
        }

        // Validate email if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                console.log('Email validation failed:', email);
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid email address or leave it empty"
                });
            }
        }

        // Format the phone number to ensure consistent format
        let formattedPhone = phone_number;
        console.log('Original phone number:', phone_number);
        
        // Remove all non-digit characters
        const digitsOnly = formattedPhone.replace(/\D/g, '');
        console.log('Digits only:', digitsOnly);

        // Handle different formats
        if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
            // 10-digit Indian number, add +91
            formattedPhone = `+91${digitsOnly}`;
            console.log('Formatted 10-digit phone to:', formattedPhone);
        } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91') && /^91[6-9]/.test(digitsOnly)) {
            // Has 91 prefix but missing +
            formattedPhone = `+${digitsOnly}`;
            console.log('Added + to phone with 91 prefix:', formattedPhone);
        } else if (formattedPhone.startsWith('+91') && digitsOnly.length === 12 && /^91[6-9]/.test(digitsOnly)) {
            // Already in correct format
            console.log('Phone already in correct format:', formattedPhone);
        } else {
            // Invalid format
            console.log('Invalid phone format:', {
                original: phone_number,
                formatted: formattedPhone,
                digitsOnly,
                length: digitsOnly.length,
                startsWithValidDigit: /^[6-9]/.test(digitsOnly)
            });
            return res.status(400).json({
                success: false,
                message: "Please provide a valid Indian phone number (10 digits starting with 6-9)"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { phone_number: formattedPhone },
                ...(email ? [{ email }] : [])
            ]
        });

        if (existingUser) {
            console.log('User already exists:', {
                phone: existingUser.phone_number,
                email: existingUser.email
            });
            return res.status(400).json({
                success: false,
                message: "User with this phone number or email already exists"
            });
        }

        // Generate OTP
        const otp = generateOTP();
        console.log('Generated OTP:', otp);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = await User.create({
            name,
            phone_number: formattedPhone,
            email,
            password: hashedPassword,
            otp: {
                code: otp,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
            }
        });

        console.log('User created successfully:', {
            id: user._id,
            name: user.name,
            phone: user.phone_number,
            email: user.email
        });

        // Send OTP
        try {
            await sendSMSOTP(formattedPhone, otp);
            console.log('OTP sent successfully');
        } catch (error) {
            console.error('Failed to send OTP:', error);
            // Don't fail registration if OTP sending fails
        }

        // Generate token
        const token = generateToken(user._id);

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(201).json({
            success: true,
            message: "Registration successful. Please verify your phone number.",
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone_number,
                email: user.email,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        console.error('Error stack:', error.stack);
        
        // Handle duplicate key errors more specifically
        if (error.code === 11000) {
            // Check which field caused the duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            // Always use a user-friendly field name and consistent message
            const fieldName = field === 'email' ? 'email' : 'phone number';
            console.log('Duplicate key error:', { field, pattern: error.keyPattern });
            return res.status(400).json({
                success: false,
                message: `A user with this ${fieldName} already exists.`,
                field
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Failed to register user. Please try again later.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

export const verifyPhone = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Phone already verified"
            });
        }

        if (!user.otp.code || !user.otp.expiresAt) {
            return res.status(400).json({
                success: false,
                message: "No OTP found. Please request a new one"
            });
        }

        if (Date.now() > user.otp.expiresAt) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one"
            });
        }

        if (user.otp.code !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // Mark user as verified
        user.isVerified = true;
        user.otp.code = null;
        user.otp.expiresAt = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Phone verified successfully"
        });
    } catch (error) {
        console.error('Phone verification error:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify phone"
        });
    }
}

export const resendOTP = async (req, res) => {
    try {
        console.log('OTP resend attempt:', req.body);
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required."
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found with ID:', userId);
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (user.verified) {
            console.log('User already verified, no need to resend OTP');
            return res.status(400).json({
                success: false,
                message: "Account is already verified."
            });
        }

        // Generate a new OTP
        console.log('Generating new OTP for user:', userId);
        const otp = generateOTP();
        const otpExpiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Save OTP to user
        user.otp = {
            code: otp,
            expiresAt: otpExpiryTime
        };
        await user.save();

        // Send OTP via available methods
        console.log('Attempting to send OTP via available methods');
        const smsSent = await sendSMSOTP(user.phone_number, otp, user.email, user.name);

        if (!smsSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to send verification code. Please try again later."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Verification code sent successfully."
        });
    } catch (error) {
        console.error('OTP resend error:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to send verification code. Please try again later.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

export const login = async (req, res) => {
    try {
        console.log('Login attempt - Full request body:', { 
            ...req.body, 
            password: req.body.password ? '[HIDDEN]' : undefined 
        });
        
        const { phone_number, email, password } = req.body;
        
        // Check if either phone or email is provided
        if (!phone_number && !email) {
            console.log('Login failed: No phone or email provided');
            return res.status(400).json({
                success: false,
                message: "Please provide either phone number or email"
            });
        }

        if (!password) {
            console.log('Login failed: No password provided');
            return res.status(400).json({
                success: false,
                message: "Password is required"
            });
        }
        
        // Find user by phone or email
        let user;
        let searchQuery = {};
        
        if (phone_number) {
            // Format phone number consistently
            let formattedPhone = phone_number;
            const digitsOnly = formattedPhone.replace(/\D/g, '');
            console.log('Phone number processing:', {
                original: phone_number,
                digitsOnly,
                length: digitsOnly.length
            });
            
            // Handle different formats
            if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
                formattedPhone = `+91${digitsOnly}`;
            } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91') && /^91[6-9]/.test(digitsOnly)) {
                formattedPhone = `+${digitsOnly}`;
            }
            
            console.log('Formatted phone:', formattedPhone);
            searchQuery.phone_number = formattedPhone;
        } else {
            searchQuery.email = email;
        }
        
        console.log('Searching for user with query:', searchQuery);
        user = await User.findOne(searchQuery);
        
        if (!user) {
            console.log('No user found with query:', searchQuery);
            return res.status(404).json({
                success: false,
                message: "No account found with these credentials"
            });
        }
        
        console.log('User found:', {
            id: user._id,
            isVerified: user.isVerified,
            hasPassword: !!user.password
        });
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password validation:', {
            isValid: isPasswordValid,
            userHasPassword: !!user.password
        });

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        try {
            // Generate token
            const token = generateToken(user._id);
            
            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Set cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax', // Changed from strict to lax for better compatibility
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            return res.status(200).json({
                success: true,
                message: "Login successful",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone_number,
                    role: user.role,
                    isVerified: user.isVerified
                }
            });
        } catch (tokenError) {
            console.error('Token generation error:', tokenError);
            return res.status(500).json({
                success: false,
                message: "Login failed due to authentication error"
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again later.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const logout = async (_,res) => {
    try {
        return res.status(200)
            .cookie("token", "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: "lax",
                maxAge: 0 // Set cookie to expire immediately
            })
            .json({
                message: "Logged out successfully.",
                success: true
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Failed to logout"
        });
    }
}
export const getUserProfile = async (req,res) => {
    try {
        const user = await User.findById(req.user._id).select("-password").populate("enrolledCourses");
        if(!user){
            return res.status(404).json({
                message:"Profile not found",
                success:false
            })
        }
        return res.status(200).json({
            success:true,
            user
        })
    } catch (error) {
        console.error('Error loading profile:', error);
        return res.status(500).json({
            success:false,
            message:"Failed to load user"
        })
    }
}
export const updateProfile = async (req,res) => {
    try {
        const userId = req.user._id;
        const {name} = req.body;
        const profilePhoto = req.file;

        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({
                message:"User not found",
                success:false
            }) 
        }

        let updatedData = {};
        
        // Update name if provided
        if (name) {
            updatedData.name = name;
        }

        // Handle profile photo update if a new file is uploaded
        if (profilePhoto) {
            // Delete old photo if it exists
            if(user.photoUrl){
                const publicId = user.photoUrl.split("/").pop().split(".")[0];
                await deleteMediaFromCloudinary(publicId);
            }

            // Upload new photo
            const cloudResponse = await uploadMedia(profilePhoto.path);
            updatedData.photoUrl = cloudResponse.secure_url;
        }

        // Only update if there are changes
        if (Object.keys(updatedData).length > 0) {
            const updatedUser = await User.findByIdAndUpdate(
                userId, 
                updatedData, 
                {new: true}
            ).select("-password");

            return res.status(200).json({
                success: true,
                user: updatedUser,
                message: "Profile updated successfully."
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "No changes provided for update"
            });
        }

    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile"
        });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('name phone_number isVerified lastLogin role enrolledCourses photoUrl')
            .populate({
                path: 'enrolledCourses',
                select: 'courseTitle coursePrice'
            })
            .sort({ lastLogin: -1 });

        return res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};

export const getDatabaseStats = async (req, res) => {
    try {
        // Get total users count
        const totalUsers = await User.countDocuments();
        
        // Get users by role
        const usersByRole = await User.aggregate([
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get verified vs unverified users
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const unverifiedUsers = await User.countDocuments({ isVerified: false });

        // Get database connection info
        const dbStatus = {
            connected: mongoose.connection.readyState === 1,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        };

        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                usersByRole,
                verificationStats: {
                    verified: verifiedUsers,
                    unverified: unverifiedUsers
                },
                dbStatus
            }
        });
    } catch (error) {
        console.error('Error getting database stats:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to get database statistics"
        });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        console.log('OTP verification attempt:', { ...req.body, otp: '[HIDDEN]' });
        const { otp, userId } = req.body;

        if (!otp || !userId) {
            return res.status(400).json({
                success: false,
                message: "OTP and userId are required."
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found with ID:', userId);
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        console.log('Found user:', { 
            id: user._id, 
            name: user.name, 
            phone: user.phone_number,
            email: user.email,
            verified: user.verified, 
            otp_expires: user.otp?.expiresAt 
        });

        // Check if user is already verified
        if (user.verified) {
            console.log('User already verified');
            return res.status(400).json({
                success: false,
                message: "Account is already verified."
            });
        }

        // Check if OTP exists and matches
        if (!user.otp || !user.otp.code) {
            console.log('No OTP found for user');
            return res.status(400).json({
                success: false,
                message: "No verification code found. Please request a new one."
            });
        }

        // Check if OTP is expired
        if (user.otp.expiresAt < new Date()) {
            console.log('OTP expired at:', user.otp.expiresAt);
            return res.status(400).json({
                success: false,
                message: "Verification code has expired. Please request a new one."
            });
        }

        // Verify OTP
        if (user.otp.code !== otp) {
            console.log('Invalid OTP provided. Expected:', user.otp.code, 'Got:', otp);
            return res.status(400).json({
                success: false,
                message: "Invalid verification code."
            });
        }

        // Valid OTP - update user to verified status
        console.log('OTP verified successfully, updating user status');
        user.verified = true;
        user.otp = undefined; // Remove OTP after successful verification
        await user.save();

        // Generate token
        console.log('Generating JWT token');
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, verified: user.verified },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        return res.status(200).json({
            success: true,
            message: "Account verified successfully.",
            token,
            user: {
                id: user._id,
                name: user.name,
                phone_number: user.phone_number,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify account. Please try again later.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

export const updateUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;
        
        if (!userId || !role) {
            return res.status(400).json({
                success: false,
                message: "User ID and role are required"
            });
        }
        
        // Validate role
        if (!["USER", "ADMIN", "INSTRUCTOR"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role - must be USER, ADMIN, or INSTRUCTOR"
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        // Update user role
        user.role = role;
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: `User role updated to ${role} successfully`,
            user: {
                id: user._id,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to update user role"
        });
    }
};