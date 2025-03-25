import { User } from "../models/user.model.js";

const isAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const userRole = req.user.role;
        if (userRole === "ADMIN" || userRole === "INSTRUCTOR") {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only administrators and instructors are allowed."
            });
        }
    } catch (error) {
        console.error('Admin access check error:', error);
        return res.status(500).json({
            success: false,
            message: "Error checking admin access"
        });
    }
};

export default isAdmin; 