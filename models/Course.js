const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lecture title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required'],
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Lecture duration is required'],
    min: [0, 'Duration cannot be negative']
  },
  order: {
    type: Number,
    required: true
  }
});

const courseSchema = new mongoose.Schema({
  lectures: [lectureSchema],
});

module.exports = mongoose.model('Course', courseSchema); 