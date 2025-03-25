import jwt from "jsonwebtoken";

export const generateToken = (res, user, message) => {
  try {
    if (!process.env.SECRET_KEY) {
      throw new Error('SECRET_KEY is not configured');
    }

    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      }, 
      process.env.SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );

    // Sanitize user object before sending
    const sanitizedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      photoUrl: user.photoUrl,
      enrolledCourses: user.enrolledCourses
    };

    return res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "lax", // Changed from strict to lax for better compatibility
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      })
      .json({
        success: true,
        message,
        user: sanitizedUser
      });
  } catch (error) {
    console.error('Token generation error:', error);
    throw error;
  }
};
