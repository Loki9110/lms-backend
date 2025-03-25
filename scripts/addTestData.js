import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Course } from '../models/course.model.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const addTestData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create test instructor if not exists
    const instructorPassword = await bcrypt.hash('Instructor@123', 10);
    let instructor = await User.findOne({ role: 'INSTRUCTOR' });
    
    if (!instructor) {
      instructor = await User.create({
        name: 'Test Instructor',
        phone_number: '+919613544999',
        email: 'instructor@example.com',
        password: instructorPassword,
        role: 'INSTRUCTOR',
        isVerified: true
      });
      console.log('Created test instructor');
    }

    // Create test users if not exist
    const userPassword = await bcrypt.hash('User@123456', 10);
    let testUser = await User.findOne({ role: 'USER' });
    
    if (!testUser) {
      testUser = await User.create({
        name: 'Test User',
        phone_number: '+919876543210',
        email: 'user@example.com',
        password: userPassword,
        role: 'USER',
        isVerified: true
      });
      console.log('Created test user');
    }

    // Create test courses
    const courses = [
      {
        courseTitle: 'Introduction to Web Development',
        courseDescription: 'Learn the basics of web development with HTML, CSS, and JavaScript',
        coursePrice: 999,
        courseLevel: 'Beginner',
        category: 'Web Development',
        creator: instructor._id,
        isPublished: true,
        enrolledStudents: [testUser._id]
      },
      {
        courseTitle: 'Advanced React Development',
        courseDescription: 'Master React with advanced concepts and best practices',
        coursePrice: 1999,
        courseLevel: 'Advance',
        category: 'Web Development',
        creator: instructor._id,
        isPublished: false,
        enrolledStudents: []
      },
      {
        courseTitle: 'Node.js Backend Development',
        courseDescription: 'Build scalable backend applications with Node.js and Express',
        coursePrice: 1499,
        courseLevel: 'Medium',
        category: 'Backend Development',
        creator: instructor._id,
        isPublished: true,
        enrolledStudents: [testUser._id]
      }
    ];

    for (const courseData of courses) {
      const existingCourse = await Course.findOne({ courseTitle: courseData.courseTitle });
      if (!existingCourse) {
        await Course.create(courseData);
        console.log(`Created course: ${courseData.courseTitle}`);
      }
    }

    console.log('Test data added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error adding test data:', error);
    process.exit(1);
  }
};

addTestData(); 