import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';

config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Simple root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to LMS API' });
});

// Import routes
import userRouter from './routes/user.route.js';
import courseRouter from './routes/course.route.js';
import purchaseCourseRouter from './routes/purchaseCourse.route.js';
import courseProgressRouter from './routes/courseProgress.route.js';

// Use routes
app.use('/api/v1', userRouter);
app.use('/api/v1', courseRouter);
app.use('/api/v1', purchaseCourseRouter);
app.use('/api/v1', courseProgressRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!'
  });
});

export default app; 