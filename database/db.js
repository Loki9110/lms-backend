import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            console.error('MongoDB URI is not defined in environment variables');
            console.error('Please check your .env file and Railway environment variables');
            throw new Error('MongoDB URI is not defined in environment variables');
        }
        console.log('Attempting to connect to MongoDB...');
        console.log('Using URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')); // Hide credentials
        
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        
        // Add connection status logging
        const state = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
        };
        console.log(`MongoDB Connection State: ${states[state]}`);
        console.log('MongoDB Connected Successfully');

        // Add error handlers
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

    } catch (error) {
        console.error("MongoDB connection error details:", {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack
        });
        // Don't exit in production, just log the error
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
}

export default connectDB;