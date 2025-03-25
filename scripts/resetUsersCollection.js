import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_management_system';

// Function to reset users collection
async function resetUsersCollection() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define the user schema
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      phone_number: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        match: /^\+91[6-9]\d{9}$/ // Validate Indian phone numbers
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
      },
      password: { type: String, required: true },
      role: { 
        type: String, 
        enum: ['instructor', 'user', 'admin'],
        default: 'user'
      },
      verified: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      otpDelivery: {
        type: [String],
        enum: ['sms', 'email', 'whatsapp', 'console'],
        default: ['sms', 'email', 'console']
      }
    });

    // Create User model
    const User = mongoose.model('User', userSchema);

    // Drop existing users collection
    console.log('Dropping users collection...');
    await mongoose.connection.dropCollection('users').catch(err => {
      if (err.code === 26) {
        console.log('Collection does not exist, skipping drop');
      } else {
        throw err;
      }
    });

    // Hash passwords for test users
    const instructorPassword = await bcrypt.hash('Instructor@123', 10);
    const userPassword = await bcrypt.hash('User@123456', 10);
    const adminPassword = await bcrypt.hash('Admin@123456', 10);

    // Create test users
    console.log('Creating test users...');
    const testUsers = [
      {
        name: 'Instructor User',
        phone_number: '+919613544999',
        email: 'instructor@example.com',
        password: instructorPassword,
        role: 'instructor',
        verified: true,
        otpDelivery: ['sms', 'email', 'console']
      },
      {
        name: 'Regular User',
        phone_number: '+919876543210',
        email: 'user@example.com',
        password: userPassword,
        role: 'user',
        verified: true,
        otpDelivery: ['sms', 'email', 'console']
      },
      {
        name: 'Admin User',
        phone_number: '+919000000000',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'admin',
        verified: true,
        otpDelivery: ['sms', 'email', 'console']
      }
    ];

    // Insert test users
    await User.insertMany(testUsers);
    console.log('Test users created successfully!');
    
    // Print out the test users
    console.log('\nTest Account Credentials:');
    console.log('--------------------------');
    console.log('Instructor:');
    console.log('  - Phone: +919613544999');
    console.log('  - Email: instructor@example.com');
    console.log('  - Password: Instructor@123');
    console.log('  - Role: instructor');
    console.log('\nUser:');
    console.log('  - Phone: +919876543210');
    console.log('  - Email: user@example.com');
    console.log('  - Password: User@123456');
    console.log('  - Role: user');
    console.log('\nAdmin:');
    console.log('  - Phone: +919000000000');
    console.log('  - Email: admin@example.com');
    console.log('  - Password: Admin@123456');
    console.log('  - Role: admin');
    console.log('--------------------------');
    console.log('All accounts are pre-verified and ready to use.');

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting users collection:', error);
    process.exit(1);
  }
}

// Execute the function
resetUsersCollection(); 