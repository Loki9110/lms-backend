import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import connectDB from './database/db.js';
import mongoose from 'mongoose';

config();

// Connect to MongoDB
connectDB();

const app = express();

// CORS configuration
app.use(cors({
    origin: ['https://bespoke-arithmetic-003431.netlify.app', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-HTTP-Method-Override']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Direct test route for MongoDB
app.get('/test-mongo', async (req, res) => {
    try {
        const state = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
        };
        res.json({
            success: true,
            connection_state: states[state],
            message: "MongoDB connection test route"
        });
    } catch (error) {
        console.error('Test route error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Test route failed"
        });
    }
});

// Routes
import userRouter from './routes/user.route.js';
import courseRouter from './routes/course.route.js';
import purchaseCourseRouter from './routes/purchaseCourse.route.js';
import courseProgressRouter from './routes/courseProgress.route.js';
import mediaRouter from './routes/media.route.js';
import instructorCourseRouter from './routes/instructor/course.route.js';

// API routes
app.use('/api/v1/user', userRouter);
app.use('/api/v1/course', courseRouter);
app.use('/api/v1/purchase', purchaseCourseRouter);
app.use('/api/v1/progress', courseProgressRouter);
app.use('/api/v1/media', mediaRouter);
app.use('/api/v1/course/instructor', instructorCourseRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app; 