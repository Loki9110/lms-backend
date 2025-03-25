import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MongoDB URI is not defined in environment variables');
        }
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error("MongoDB connection error:", error);
        // Don't exit in production, just log the error
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
}
export default connectDB;