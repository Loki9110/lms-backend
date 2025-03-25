import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import isAdmin from "../middlewares/isAdmin.js";
import { 
  createCheckoutSession, 
  getAllPurchasedCourse, 
  getCourseDetailWithPurchaseStatus, 
  completeDummyPayment,
  enrollFreeCourse,
  requestAccess,
  getAccessRequests,
  getPendingRequestsCount,
  updateAccessRequest,
  deleteAccessRequest
} from "../controllers/coursePurchase.controller.js";

const router = express.Router();

router.route("/enroll-free").post(isAuthenticated, enrollFreeCourse);
router.route("/checkout/create-checkout-session").post(isAuthenticated, createCheckoutSession);
router.route("/complete-payment/:paymentId").post(isAuthenticated, completeDummyPayment);
router.route("/course/:courseId/detail-with-status").get(isAuthenticated, getCourseDetailWithPurchaseStatus);
router.route("/").get(isAuthenticated, getAllPurchasedCourse);

// Access request routes
router.route("/request-access").post(isAuthenticated, requestAccess);
router.route("/access-requests").get(isAuthenticated, isAdmin, getAccessRequests);
router.route("/access-requests/pending-count").get(isAuthenticated, isAdmin, getPendingRequestsCount);
router.route("/access-requests/:requestId")
  .patch(isAuthenticated, isAdmin, updateAccessRequest)
  .delete(isAuthenticated, isAdmin, deleteAccessRequest);

export default router;