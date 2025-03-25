import express from 'express';
import { getCourseById, getPublicCourses } from '../controllers/course.controller.js';

const router = express.Router();

router.get('/public', getPublicCourses);
router.get('/:id', getCourseById);

export default router; 