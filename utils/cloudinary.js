import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config({});

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

export const uploadMedia = async (file, folder = "course-thumbnails") => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    // Convert base64 to buffer if needed
    const buffer = Buffer.from(file.split(",")[1], "base64");

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "auto",
            transformation: [
              { width: 800, height: 600, crop: "fill" },
              { quality: "auto:good" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    if (!result.secure_url) {
      throw new Error("Failed to get secure URL from Cloudinary");
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error(`Failed to upload media: ${error.message}`);
  }
};

export const deleteMediaFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error("No public ID provided");
    }

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error(`Failed to delete media: ${error.message}`);
  }
};

export const deleteVideoFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error("No public ID provided");
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
    return result;
  } catch (error) {
    console.error("Cloudinary video delete error:", error);
    throw new Error(`Failed to delete video: ${error.message}`);
  }
};

