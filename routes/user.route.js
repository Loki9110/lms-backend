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

const router = express.Router();

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