import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

async function createTestUsers() {
  try {
    // Drop the collection completely to remove indexes
    console.log('Dropping the users collection to remove all indexes...');
    await mongoose.connection.dropCollection('users').catch(err => {
      if (err.codeName === 'NamespaceNotFound') {
        console.log('Collection does not exist, will be created fresh');
      } else {
        throw err;
      }
    });

    console.log('Creating test users...');

    // Create an instructor user
    const instructorPassword = await bcrypt.hash('Instructor@123', 10);
    const instructor = await User.create({
      name: 'Test Instructor',
      phone_number: '+919613544999',
      password: instructorPassword,
      role: 'INSTRUCTOR',
      isVerified: true
    });
    console.log('Created instructor user:', instructor._id);

    // Create a regular user
    const userPassword = await bcrypt.hash('User@123456', 10);
    const user = await User.create({
      name: 'Test User',
      phone_number: '+919876543210',
      password: userPassword,
      role: 'USER',
      isVerified: true
    });
    console.log('Created regular user:', user._id);

    // Create an admin user
    const adminPassword = await bcrypt.hash('Admin@123456', 10);
    const admin = await User.create({
      name: 'Test Admin',
      phone_number: '+919000000000',
      password: adminPassword,
      role: 'ADMIN',
      isVerified: true
    });
    console.log('Created admin user:', admin._id);

    console.log('----------------------------');
    console.log('Test Users Created Successfully');
    console.log('----------------------------');
    console.log('Instructor: +919613544999 / Instructor@123');
    console.log('User: +919876543210 / User@123456');
    console.log('Admin: +919000000000 / Admin@123456');
    console.log('----------------------------');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Execute the function
createTestUsers(); 