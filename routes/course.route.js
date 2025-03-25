import express from "express";
import multer from "multer";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isAdmin from "../middlewares/isAdmin.js";
import { createCourse, createLecture, editCourse, editLecture, getCourseById, getCourseLecture, getCreatorCourses, getLectureById, getPublishedCourse, removeCourse, removeLecture, searchCourse, togglePublishCourse } from "../controllers/course.controller.js";
import upload from "../utils/multer.js";
const router = express.Router();

// Course routes
router.route("/").post(isAuthenticated, isAdmin, upload.single("courseThumbnail"), createCourse);
router.route("/search").get(searchCourse);
router.route("/published-courses").get(getPublishedCourse);
router.route("/").get(isAuthenticated, getCreatorCourses);

// Enhanced file upload error handling for course updates
router.route("/:courseId").put(
  isAuthenticated, 
  isAdmin, 
  (req, res, next) => {
    console.log(`Processing PUT request for course ID: ${req.params.courseId}`);
    console.log(`Request Content-Type: ${req.headers['content-type']}`);
    
    upload.single("courseThumbnail")(req, res, (err) => {
      if (err) {
        console.error("File upload error:", err);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              success: false,
              message: "File is too large. Maximum size is 10MB."
            });
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              message: "Unexpected file field. Please use 'courseThumbnail' as the field name."
            });
          }
        } else if (err.message.includes('Only image files are allowed')) {
          return res.status(400).json({
            success: false,
            message: "Only image files are allowed for course thumbnail."
          });
        }
        
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`
        });
      }
      
      // Log successful file processing
      if (req.file) {
        console.log(`File uploaded successfully: ${req.file.originalname} (${req.file.size} bytes)`);
      } else {
        console.log("No file uploaded with this request");
      }
      
      next();
    });
  }, 
  editCourse
);

router.route("/:courseId").get(isAuthenticated, getCourseById);
router.route("/:courseId").delete(isAuthenticated, isAdmin, removeCourse);

// Lecture routes - make sure API paths match those in courseApi.js
router.post("/lecture/:courseId", isAuthenticated, isAdmin, createLecture);
router.route("/:courseId/lecture").get(isAuthenticated, getCourseLecture);
router.route("/:courseId/lecture/:lectureId").post(isAuthenticated, isAdmin, editLecture);
router.delete("/lecture/:lectureId", isAuthenticated, isAdmin, removeLecture);
router.route("/lecture/:lectureId").get(isAuthenticated, getLectureById);

// Publish/unpublish route 
router.patch("/publish/:courseId", isAuthenticated, isAdmin, togglePublishCourse);
router.post("/publish/:courseId", isAuthenticated, isAdmin, togglePublishCourse);

export default router;