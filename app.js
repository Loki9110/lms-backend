import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import connectDB from './database/db.js';

config();

// Connect to MongoDB
connectDB();

const app = express();

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL || "https://yourdomain.com" 
        : "http://localhost:5173",
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

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app; 