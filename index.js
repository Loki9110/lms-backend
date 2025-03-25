import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import multer from "multer";
import connectDB from "./database/db.js";
import app from './app.js';
import { config } from 'dotenv';

config();

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


