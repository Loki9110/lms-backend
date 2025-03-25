import { Course } from "../models/course.model.js";
import {deleteMediaFromCloudinary, deleteVideoFromCloudinary, uploadMedia} from "../utils/cloudinary.js";

export const createCourse = async (req,res) => {
    try {
        const {courseTitle, category} = req.body;
        if(!courseTitle || !category) {
            return res.status(400).json({
                message:"Course title and category is required."
            })
        }

        const course = await Course.create({
            courseTitle,
            category,
            creator: req.user._id
        });

        return res.status(201).json({
            course,
            message:"Course created."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create course"
        })
    }
}

export const searchCourse = async (req,res) => {
    try {
        const {query = "", categories = [], sortByPrice =""} = req.query;
        console.log(categories);
        
        // create search query
        const searchCriteria = {
            isPublished:true,
            $or:[
                {courseTitle: {$regex:query, $options:"i"}},
                {subTitle: {$regex:query, $options:"i"}},
                {category: {$regex:query, $options:"i"}},
            ]
        }

        // if categories selected
        if(categories.length > 0) {
            searchCriteria.category = {$in: categories};
        }

        // define sorting order
        const sortOptions = {};
        if(sortByPrice === "low"){
            sortOptions.coursePrice = 1;//sort by price in ascending
        }else if(sortByPrice === "high"){
            sortOptions.coursePrice = -1; // descending
        }

        let courses = await Course.find(searchCriteria).populate({path:"creator", select:"name photoUrl"}).sort(sortOptions);

        return res.status(200).json({
            success:true,
            courses: courses || []
        });

    } catch (error) {
        console.log(error);
        
    }
}

export const getPublishedCourse = async (_,res) => {
    try {
        const courses = await Course.find({isPublished:true}).populate({path:"creator", select:"name photoUrl"});
        
        return res.status(200).json({
            success: true,
            courses: courses || []
        });
    } catch (error) {
        console.error("Error fetching published courses:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get published courses"
        });
    }
}
export const getCreatorCourses = async (req,res) => {
    try {
        const userId = req.user._id;
        const courses = await Course.find({creator:userId});
        if(!courses){
            return res.status(404).json({
                courses:[],
                message:"Course not found"
            })
        };
        return res.status(200).json({
            courses,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create course"
        })
    }
}
export const editCourse = async (req,res) => {
    try {
        const courseId = req.params.courseId;
        const {courseTitle, subTitle, description, category, courseLevel, coursePrice, status, courseThumbnail} = req.body;

        console.log("Edit course request received:", {
            courseId,
            userId: req.user?._id?.toString(),
            method: req.method,
            body: req.body
        });

        // Validate required fields
        if(!courseId) {
            return res.status(400).json({
                success: false,
                message: "Course ID is required"
            });
        }

        // Find the course
        let course = await Course.findById(courseId);
        if(!course){
            return res.status(404).json({
                success: false,
                message: "Course not found!"
            });
        }

        // Check if user is authorized to edit this course
        if (course.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to edit this course"
            });
        }

        // Prepare update object
        const updateData = {
            ...(courseTitle && { courseTitle: courseTitle.trim() }),
            ...(category && { category }),
            ...(courseLevel && { courseLevel }),
            ...(coursePrice && { coursePrice: Number(coursePrice) }),
            ...(status && { status }),
            ...(status && { isPublished: status === "active" }),
            ...(subTitle && { subTitle: subTitle.trim() }),
            ...(description && { description }),
            ...(courseThumbnail && { courseThumbnail })
        };

        // Update the course
        const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            updateData,
            { new: true }
        ).populate('creator', 'name email');

        if (!updatedCourse) {
            return res.status(500).json({
                success: false,
                message: "Failed to update course"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Course updated successfully",
            course: updatedCourse
        });

    } catch (error) {
        console.error("Error in editCourse:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update course",
            error: error.message
        });
    }
}
export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate({
        path: "creator",
        select: "name email photoUrl"
      })
      .populate("lectures");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found!"
      });
    }

    // Transform the course object to ensure lecture fields match frontend expectation
    const transformedCourse = {
      ...course.toObject(),
      lectures: course.lectures.map(lecture => ({
        _id: lecture._id,
        lectureTitle: lecture.title,
        youtubeUrl: lecture.videoUrl,
        isPreviewFree: lecture.isPreviewFree
      }))
    };

    return res.status(200).json({
      success: true,
      course: transformedCourse
    });
  } catch (error) {
    console.error("Error getting course by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get course details. Please try again."
    });
  }
};

// Utility function to validate YouTube URL
const isValidYouTubeUrl = (url) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
  return youtubeRegex.test(url);
};

// Utility function to extract video ID from YouTube URL
const extractVideoId = (url) => {
  if (!url) return '';
  
  // Extract video ID from youtube.com URL
  let match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  
  // Extract video ID from youtu.be URL
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  
  return '';
};

// Utility function to standardize YouTube URL
const standardizeYouTubeUrl = (url) => {
  const videoId = extractVideoId(url);
  if (!videoId) return url;
  return `https://www.youtube.com/watch?v=${videoId}`;
};

export const createLecture = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { title, description, videoUrl } = req.body;

    // Validate input
    if (!title || !videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Title and video URL are required",
      });
    }

    // Validate YouTube URL
    if (!isValidYouTubeUrl(videoUrl)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid YouTube URL",
      });
    }

    // Standardize YouTube URL
    const standardizedVideoUrl = standardizeYouTubeUrl(videoUrl);

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is the creator
    if (course.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to add lectures to this course",
      });
    }

    // Create lecture
    const lecture = {
      title,
      description: description || title,
      videoUrl: standardizedVideoUrl,
    };

    // Add lecture to course
    course.lectures.push(lecture);
    
    // Save course with new lecture
    await course.save();

    return res.status(201).json({
      success: true,
      message: "Lecture added successfully",
      course,
    });
  } catch (error) {
    console.error("Error creating lecture:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add lecture. Please try again.",
    });
  }
};

export const getCourseLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    
    // Transform lectures to match the expected frontend fields
    const transformedLectures = course.lectures.map(lecture => ({
      _id: lecture._id,
      lectureTitle: lecture.title,
      youtubeUrl: lecture.videoUrl,
      isPreviewFree: lecture.isPreviewFree
    }));
    
    return res.status(200).json({
      success: true,
      lectures: transformedLectures || []
    });
  } catch (error) {
    console.error("Error getting course lectures:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get lectures. Please try again."
    });
  }
}
export const editLecture = async (req, res) => {
  try {
    const { title, lectureTitle, description, videoUrl, youtubeUrl, isPreviewFree } = req.body;
    const { courseId, lectureId } = req.params;
    
    console.log("Edit lecture request body:", req.body);
    
    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found!"
      });
    }
    
    // Check if user is the creator
    if (course.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit lectures in this course"
      });
    }
    
    // Find the lecture in the lectures array
    const lectureIndex = course.lectures.findIndex(
      (lecture) => lecture._id.toString() === lectureId
    );
    
    if (lectureIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found in this course"
      });
    }
    
    // Update lecture fields if provided - handle both naming conventions
    // Frontend uses lectureTitle, backend stores as title
    if (lectureTitle || title) {
      course.lectures[lectureIndex].title = lectureTitle || title;
    }
    
    if (description) {
      course.lectures[lectureIndex].description = description;
    }
    
    // Frontend uses youtubeUrl, backend stores as videoUrl
    if (youtubeUrl || videoUrl) {
      course.lectures[lectureIndex].videoUrl = youtubeUrl || videoUrl;
    }
    
    if (isPreviewFree !== undefined) {
      course.lectures[lectureIndex].isPreviewFree = isPreviewFree;
    }
    
    // Save the course with updated lecture
    await course.save();
    
    // Transform the response to match frontend expectations
    const updatedLecture = {
      _id: course.lectures[lectureIndex]._id,
      lectureTitle: course.lectures[lectureIndex].title,
      youtubeUrl: course.lectures[lectureIndex].videoUrl,
      isPreviewFree: course.lectures[lectureIndex].isPreviewFree
    };
    
    return res.status(200).json({
      success: true,
      message: "Lecture updated successfully",
      lecture: updatedLecture
    });
  } catch (error) {
    console.error("Error editing lecture:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to edit lecture. Please try again."
    });
  }
}
export const removeLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { courseId } = req.query;

    if (!lectureId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Lecture ID and Course ID are required",
      });
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is the creator
    if (course.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to remove lectures from this course",
      });
    }

    // Find lecture index
    const lectureIndex = course.lectures.findIndex(
      (lecture) => lecture._id.toString() === lectureId
    );

    if (lectureIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found in this course",
      });
    }

    // Remove lecture from array
    course.lectures.splice(lectureIndex, 1);

    // Save course
    await course.save();

    return res.status(200).json({
      success: true,
      message: "Lecture removed successfully",
      course,
    });
  } catch (error) {
    console.error("Error removing lecture:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove lecture. Please try again.",
    });
  }
};
export const getLectureById = async (req, res) => {
  try {
    const { lectureId } = req.params;
    
    // Find course containing the lecture
    const course = await Course.findOne({ "lectures._id": lectureId });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found!"
      });
    }
    
    // Find the specific lecture in the course
    const lecture = course.lectures.find(
      (lec) => lec._id.toString() === lectureId
    );
    
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found!"
      });
    }
    
    // Transform the lecture object to match the expected frontend fields
    const transformedLecture = {
      _id: lecture._id,
      lectureTitle: lecture.title || "Untitled",
      title: lecture.title || "Untitled",  // Include both for compatibility
      youtubeUrl: lecture.videoUrl,
      videoUrl: lecture.videoUrl,  // Include both for compatibility
      isPreviewFree: lecture.isPreviewFree
    };
    
    return res.status(200).json({
      success: true,
      lecture: transformedLecture,
      courseId: course._id
    });
  } catch (error) {
    console.error("Error getting lecture:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get lecture. Please try again."
    });
  }
};


// publich unpublish course logic

export const togglePublishCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { status } = req.body;
    
    console.log("Publishing course request received:", { 
      courseId, 
      status,
      method: req.method,
      methodOverride: req.headers['x-http-method-override'],
      body: req.body,
      headers: req.headers,
      userId: req.user?._id?.toString(),
      user: req.user
    });

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    // Validate if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    console.log("Course found:", { 
      courseId: course._id.toString(), 
      creatorId: course.creator.toString(), 
      userId: req.user?._id?.toString() || "No user ID"
    });

    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Validate if course belongs to the creator
    if (course.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action",
      });
    }

    // Additional validations for publishing
    if (status === "true") {
      // Check for required fields
      if (!course.courseTitle || !course.category || !course.courseLevel) {
        return res.status(400).json({
          success: false,
          message: "Please fill in all required fields (title, category, level) before publishing",
        });
      }

      // Validate if lectures exist
      if (!course.lectures || course.lectures.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please add at least one lecture before publishing the course",
        });
      }

      // Validate if thumbnail exists
      if (!course.courseThumbnail) {
        return res.status(400).json({
          success: false,
          message: "Please add a course thumbnail before publishing",
        });
      }

      // Validate if description exists
      if (!course.description) {
        return res.status(400).json({
          success: false,
          message: "Please add a course description before publishing",
        });
      }
    }

    // Update course publish status
    course.isPublished = status === "true";
    
    // Set status field to "active" or "draft"
    course.status = status === "true" ? "active" : "draft";
    
    await course.save();
    
    console.log("Course publish status updated successfully:", { 
      courseId, 
      isPublished: course.isPublished,
      status: course.status,
      thumbnail: course.courseThumbnail
    });

    return res.status(200).json({
      success: true,
      message: `Course ${status === "true" ? "published" : "unpublished"} successfully`,
      course,
    });
  } catch (error) {
    console.error("Error in togglePublishCourse:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update course status. Please try again.",
      error: error.message,
    });
  }
};

export const removeCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;

        // Find the course and populate creator
        const course = await Course.findById(courseId).populate('creator', '_id');
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found!"
            });
        }

        // Check if the user is the creator of the course
        if (!course.creator || course.creator._id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this course"
            });
        }

        // Delete course thumbnail from cloudinary if it exists
        if (course.courseThumbnail) {
            try {
                const publicId = course.courseThumbnail.split("/").pop().split(".")[0];
                await deleteMediaFromCloudinary(publicId);
            } catch (cloudinaryError) {
                console.error("Error deleting thumbnail from Cloudinary:", cloudinaryError);
                // Continue with course deletion even if thumbnail deletion fails
            }
        }

        // Delete the course (lectures are now embedded so they're deleted automatically)
        await Course.findByIdAndDelete(courseId);

        return res.status(200).json({
            success: true,
            message: "Course deleted successfully"
        });
    } catch (error) {
        console.error("Error removing course:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete course. Please try again."
        });
    }
};
