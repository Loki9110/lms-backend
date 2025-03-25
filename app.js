import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';

config();

const app = express();

// CORS configuration
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// API routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/courses', courseRouter);
app.use('/api/v1/purchases', purchaseCourseRouter);
app.use('/api/v1/progress', courseProgressRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!'
  });
});

export default app; 