import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
  lectureTitle: {
    type: String,
    required: true,
  },
  youtubeUrl: { 
    type: String,
    required: true 
  },
  isPreviewFree: { 
    type: Boolean,
    default: false 
  },
}, {timestamps:true});

export const Lecture = mongoose.model("Lecture", lectureSchema);
