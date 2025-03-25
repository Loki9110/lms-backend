import { CourseProgress } from "../models/courseProgress.js";
import { Course } from "../models/course.model.js";

export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // step-1 fetch the user course progress
    let courseProgress = await CourseProgress.findOne({
      courseId,
      userId,
    }).populate("courseId");

    const courseDetails = await Course.findById(courseId).populate("lectures");

    if (!courseDetails) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    // Transform the lectures to have the fields expected by the frontend
    const transformedCourseDetails = {
      ...courseDetails.toObject(),
      lectures: courseDetails.lectures.map(lecture => ({
        _id: lecture._id,
        lectureTitle: lecture.title,
        youtubeUrl: lecture.videoUrl,
        isPreviewFree: lecture.isPreviewFree
      }))
    };

    // Step-2 If no progress found, return course details with an empty progress
    if (!courseProgress) {
      return res.status(200).json({
        data: {
          courseDetails: transformedCourseDetails,
          progress: [],
          completed: false,
        },
      });
    }

    // Step-3 Return the user's course progress alog with course details
    return res.status(200).json({
      data: {
        courseDetails: transformedCourseDetails,
        progress: courseProgress.lectureProgress,
        completed: courseProgress.completed,
      },
    });
  } catch (error) {
    console.error('Error getting course progress:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to get course progress"
    });
  }
};

export const updateLectureProgress = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const { viewed } = req.body;
    const userId = req.user._id;

    if (typeof viewed !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "The 'viewed' property must be a boolean value"
      });
    }

    // fetch or create course progress
    let courseProgress = await CourseProgress.findOne({ courseId, userId });

    if (!courseProgress) {
      // If no progress exist, create a new record
      courseProgress = new CourseProgress({
        userId,
        courseId,
        completed: false,
        lectureProgress: [],
      });
    }

    // find the lecture progress in the course progress
    const lectureIndex = courseProgress.lectureProgress.findIndex(
      (lecture) => lecture.lectureId === lectureId
    );

    if (lectureIndex !== -1) {
      // if lecture already exist, update its status
      courseProgress.lectureProgress[lectureIndex].viewed = viewed;
    } else {
      // Add new lecture progress
      courseProgress.lectureProgress.push({
        lectureId,
        viewed
      });
    }

    // if all lecture is complete
    const lectureProgressLength = courseProgress.lectureProgress.filter(
      (lectureProg) => lectureProg.viewed
    ).length;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    if (course.lectures.length === lectureProgressLength) {
      courseProgress.completed = true;
    } else {
      courseProgress.completed = false;
    }

    await courseProgress.save();

    return res.status(200).json({
      success: true,
      message: viewed ? "Lecture marked as completed" : "Lecture marked as uncompleted"
    });
  } catch (error) {
    console.error("Error updating lecture progress:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update lecture progress"
    });
  }
};

export const markAsCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const courseProgress = await CourseProgress.findOne({ courseId, userId });
    if (!courseProgress)
      return res.status(404).json({ 
        success: false,
        message: "Course progress not found" 
      });

    courseProgress.lectureProgress.map(
      (lectureProgress) => (lectureProgress.viewed = true)
    );
    courseProgress.completed = true;
    await courseProgress.save();
    
    return res.status(200).json({ 
      success: true,
      message: "Course marked as completed." 
    });
  } catch (error) {
    console.error("Error marking course as completed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update course status"
    });
  }
};

export const markAsInCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const courseProgress = await CourseProgress.findOne({ courseId, userId });
    if (!courseProgress)
      return res.status(404).json({ 
        success: false,
        message: "Course progress not found" 
      });

    courseProgress.lectureProgress.map(
      (lectureProgress) => (lectureProgress.viewed = false)
    );
    courseProgress.completed = false;
    await courseProgress.save();
    
    return res.status(200).json({ 
      success: true,
      message: "Course marked as incompleted." 
    });
  } catch (error) {
    console.error("Error marking course as incompleted:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update course status"
    });
  }
};
