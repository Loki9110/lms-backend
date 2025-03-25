import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
import { AccessRequest } from "../models/accessRequest.model.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.body;

    // Check if user has already purchased the course
    const existingPurchase = await CoursePurchase.findOne({
      userId,
      courseId,
      status: "completed"
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: "You have already purchased this course"
      });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ 
      success: false,
      message: "Course not found!" 
    });

    // Create a new course purchase record with a dummy payment ID
    const dummyPaymentId = `DUMMY_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
      paymentId: dummyPaymentId
    });

    await newPurchase.save();

    // Return a dummy checkout URL that will redirect to success
    return res.status(200).json({
      success: true,
      url: `http://localhost:5173/dummy-payment/${dummyPaymentId}?courseId=${courseId}`,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to create checkout session" 
    });
  }
};

// Replace Stripe webhook with dummy payment completion endpoint
export const completeDummyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id;  // Get the authenticated user's ID
    
    const purchase = await CoursePurchase.findOne({ paymentId }).populate({ path: "courseId" });
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found"
      });
    }

    // Verify that the purchase belongs to the authenticated user
    if (purchase.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: This purchase does not belong to you"
      });
    }

    // Check if purchase is already completed
    if (purchase.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "This purchase has already been completed"
      });
    }

    purchase.status = "completed";

    // Make all lectures visible by setting `isPreviewFree` to true
    if (purchase.courseId && purchase.courseId.lectures.length > 0) {
      await Lecture.updateMany(
        { _id: { $in: purchase.courseId.lectures } },
        { $set: { isPreviewFree: true } }
      );
    }

    await purchase.save();

    // Update user's enrolledCourses
    await User.findByIdAndUpdate(
      userId,  // Use the authenticated user's ID
      { $addToSet: { enrolledCourses: purchase.courseId._id } },
      { new: true }
    );

    // Update course to add user ID to enrolledStudents
    await Course.findByIdAndUpdate(
      purchase.courseId._id,
      { $addToSet: { enrolledStudents: userId } },  // Use the authenticated user's ID
      { new: true }
    );

    // Return success with courseId for client-side redirection
    return res.status(200).json({ 
      success: true,
      courseId: purchase.courseId._id
    });
  } catch (error) {
    console.error("Error handling payment completion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete the purchase"
    });
  }
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId)
      .populate({ path: "creator" })
      .populate({ path: "lectures" });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found!"
      });
    }

    // Transform the course object to match the expected frontend fields
    const transformedCourse = {
      ...course.toObject(),
      lectures: course.lectures.map(lecture => ({
        _id: lecture._id,
        lectureTitle: lecture.title,
        youtubeUrl: lecture.videoUrl,
        isPreviewFree: lecture.isPreviewFree
      }))
    };

    // Check for completed purchase
    const purchased = await CoursePurchase.findOne({ 
      userId, 
      courseId,
      status: "completed"
    });

    // Check for access request
    const accessRequest = await AccessRequest.findOne({
      userId,
      courseId
    });

    return res.status(200).json({
      success: true,
      course: transformedCourse,
      purchased: !!purchased,
      status: accessRequest ? accessRequest.status : null
    });
  } catch (error) {
    console.error('Error in getCourseDetailWithPurchaseStatus:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch course details"
    });
  }
};

export const getAllPurchasedCourse = async (_, res) => {
  try {
    const purchasedCourse = await CoursePurchase.find({
      status: "completed",
    }).populate("courseId");
    if (!purchasedCourse) {
      return res.status(404).json({
        purchasedCourse: [],
      });
    }
    return res.status(200).json({
      purchasedCourse,
    });
  } catch (error) {
    console.log(error);
  }
};

// New function for free course enrollment
export const enrollFreeCourse = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.body;

    // Verify the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Remove the price check to allow any course to be enrolled for free
    // This allows courses with null, undefined, or string prices to be enrolled

    // Check if already enrolled
    const existingPurchase = await CoursePurchase.findOne({
      userId,
      courseId,
      status: "completed"
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this course"
      });
    }

    // Create a completed purchase record for the free course
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: 0,
      status: "completed",
      paymentId: `FREE_${Date.now()}`
    });

    await newPurchase.save();

    // Update user's enrolledCourses
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { enrolledCourses: courseId } },
      { new: true }
    );

    // Update course's enrolledStudents
    await Course.findByIdAndUpdate(
      courseId,
      { $addToSet: { enrolledStudents: userId } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      courseId
    });
  } catch (error) {
    console.error("Error enrolling in free course:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to enroll in the course"
    });
  }
};

export const requestAccess = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Check if user already has access or a pending request
    const existingRequest = await AccessRequest.findOne({
      userId,
      courseId
    });

    // If there's an existing request that's declined, update it to pending
    if (existingRequest && existingRequest.status === 'declined') {
      existingRequest.status = 'pending';
      await existingRequest.save();
      return res.status(200).json({
        success: true,
        message: "Access request submitted successfully"
      });
    }

    // If there's an existing request that's pending or approved, return error
    if (existingRequest && ['pending', 'approved'].includes(existingRequest.status)) {
      return res.status(400).json({
        success: false,
        message: existingRequest.status === 'approved' 
          ? "You already have access to this course"
          : "You already have a pending request for this course"
      });
    }

    // Create new access request
    const newRequest = new AccessRequest({
      userId,
      courseId,
      status: 'pending'
    });

    await newRequest.save();

    return res.status(200).json({
      success: true,
      message: "Access request submitted successfully"
    });
  } catch (error) {
    console.error('Error in requestAccess:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit access request"
    });
  }
};

export const getAccessRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find()
      .populate({
        path: 'userId',
        select: 'name email photoUrl phone_number'
      })
      .populate({
        path: 'courseId',
        select: 'courseTitle coursePrice',
        populate: {
          path: 'creator',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests: requests.map(request => ({
        _id: request._id,
        status: request.status,
        createdAt: request.createdAt,
        user: request.userId,
        course: request.courseId
      }))
    });
  } catch (error) {
    console.error('Error in getAccessRequests:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch access requests"
    });
  }
};

export const getPendingRequestsCount = async (req, res) => {
  try {
    const count = await AccessRequest.countDocuments({ status: 'pending' });
    
    return res.status(200).json({
      success: true,
      pendingCount: count
    });
  } catch (error) {
    console.error('Error in getPendingRequestsCount:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending requests count"
    });
  }
};

export const updateAccessRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }

    // Find the access request
    const accessRequest = await AccessRequest.findById(requestId);
    if (!accessRequest) {
      return res.status(404).json({
        success: false,
        message: "Access request not found"
      });
    }

    // Update the status
    accessRequest.status = status;
    await accessRequest.save();

    // If approved, enroll user in the course
    if (status === 'approved') {
      const { userId, courseId } = accessRequest;

      // Add user to course's enrolled students array
      await Course.findByIdAndUpdate(
        courseId,
        { $addToSet: { enrolledStudents: userId } }
      );

      // Get more details about the course and user for notification
      const populatedRequest = await AccessRequest.findById(requestId)
        .populate({
          path: 'userId',
          select: 'name email photoUrl phone_number'
        })
        .populate({
          path: 'courseId',
          select: 'courseTitle coursePrice'
        });

      return res.status(200).json({
        success: true,
        message: `Request ${status} successfully`,
        request: {
          _id: populatedRequest._id,
          status: populatedRequest.status,
          user: populatedRequest.userId,
          course: populatedRequest.courseId
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Request ${status} successfully`
    });
  } catch (error) {
    console.error('Error in updateAccessRequest:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to update access request"
    });
  }
};

export const deleteAccessRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await AccessRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Access request not found"
      });
    }

    // Only allow deleting declined requests
    if (request.status !== 'declined') {
      return res.status(400).json({
        success: false,
        message: "Only declined requests can be deleted"
      });
    }

    await AccessRequest.findByIdAndDelete(requestId);

    return res.status(200).json({
      success: true,
      message: "Access request deleted successfully"
    });
  } catch (error) {
    console.error('Error in deleteAccessRequest:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete access request"
    });
  }
};
