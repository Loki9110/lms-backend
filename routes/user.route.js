import express from "express";
import { 
    getUserProfile, 
    login, 
    logout, 
    register, 
    updateProfile, 
    verifyPhone,
    resendOTP,
    getAllUsers,
    getDatabaseStats,
    updateUserRole
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isAdmin from "../middlewares/isAdmin.js";
import upload from "../utils/multer.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const router = express.Router();

// Add test route for MongoDB connection
router.get("/test-db", async (req, res) => {
    try {
        // Check connection state
        const state = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
        };

        // Try to count users as a test query
        const userCount = await User.countDocuments();
        
        return res.status(200).json({
            success: true,
            connection_state: states[state],
            user_count: userCount,
            message: "Database connection test successful"
        });
    } catch (error) {
        console.error("Database test error:", error);
        return res.status(500).json({
            success: false,
            error: error.message,
            connection_state: states[mongoose.connection.readyState],
            message: "Database connection test failed"
        });
    }
});

// Add route to check existing users
router.get("/check-users", async (req, res) => {
    try {
        const users = await User.find().select('name email phone_number role isVerified');
        return res.status(200).json({
            success: true,
            users: users,
            count: users.length,
            message: "Users retrieved successfully"
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: "Failed to fetch users"
        });
    }
});

router.route("/register").post(register);
router.route("/verify-phone").post(verifyPhone);
router.route("/resend-otp").post(resendOTP);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/profile").get(isAuthenticated, getUserProfile);
router.route("/profile/update").put(isAuthenticated, upload.single("profilePhoto"), updateProfile);
router.route("/users").get(isAuthenticated, isAdmin, getAllUsers);
router.route("/database-stats").get(isAuthenticated, isAdmin, getDatabaseStats);
router.route("/user/role").put(isAuthenticated, isAdmin, updateUserRole);

// Debug route - should be removed in production
router.route("/debug-users").get(async (req, res) => {
    try {
        const users = await User.find().select('phone_number name role');
        return res.status(200).json(users);
    } catch (error) {
        console.error('Debug route error:', error);
        return res.status(500).json({ error: 'Failed to fetch users' });
    }
});

export default router;