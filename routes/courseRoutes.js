import express from 'express';
import { getPublishedCourses } from '../controllers/courseController.js';

const router = express.Router();

router.get('/published', getPublishedCourses);

export default router; 