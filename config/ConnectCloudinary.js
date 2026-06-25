import { v2 as cloudinary } from "cloudinary";
import { Cloudinary_API_Key, Cloudinary_Name, Cloudinary_Secret } from "./ENV_variable.js";

// Cloudinary Configuration Initialize
cloudinary.config({
    api_key: Cloudinary_API_Key,
    api_secret: Cloudinary_Secret,
    cloud_name: Cloudinary_Name
});

/**
 * Uploads raw file buffer streams to Cloudinary buckets dynamically
 * @param {Buffer} buffer - Multer file buffer stream
 * @param {Object} option - Cloudinary upload configurations
 */
export const uploadBuffer = (buffer, option = {}) => {
    return new Promise((resolve, reject) => {
        // Enforcing dynamic automatic resource identification if not explicitly overridden by controllers
        const uploadOptions = {
            resource_type: option.resource_type || "auto",
            ...option
        };

        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
                console.error("[Cloudinary Stream Error]:", error.message);
                reject(error);
            } else {
                resolve(result);
            }
        });

        stream.end(buffer);
    });
};

/**
 * Extract resource type and public ID from fully absolute Cloudinary asset URLs 
 * and purges the asset permanently from the bucket storage and CDN layers.
 * @param {String} imageUrl - Complete absolute Cloudinary asset HTTP/HTTPS resource URL string
 */
export const deleteFromCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.includes("cloudinary.com")) {
            console.log("Invalid or non-Cloudinary URL string skipped:", imageUrl);
            return false;
        }

        // 1. Split URL at the 'upload' segment to extract operational routes safely
        const urlParts = imageUrl.split("/");
        const uploadIndex = urlParts.indexOf("upload");

        if (uploadIndex === -1) {
            console.log("Invalid Cloudinary URL structural signature:", imageUrl);
            return false;
        }

        // 2. Auto-Detect Resource Typology (Positioned exactly 1 segment prior to '/upload/')
        // This dynamically parses whether it belongs to 'image', 'video', or 'raw' (PDFs/Docs) blocks
        let resourceType = "image";
        const detectedType = urlParts[uploadIndex - 1];
        
        if (detectedType === "video" || detectedType === "raw") {
            resourceType = detectedType;
        }

        // 3. Re-assemble nested directory path structures after the version components (v1782xxxxx)
        const pathParts = urlParts.slice(uploadIndex + 2);
        const fullPath = pathParts.join("/");

        // 4. Extract public ID string signature by dropping the extension suffix neatly
        const publicId = fullPath.substring(0, fullPath.lastIndexOf("."));

        // 5. Execute Cloudinary API Hard Trash Engine
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType, // CRITICAL: Crucial parameter to drop videos and raw pdf configurations
            invalidate: true             // Force purges the edge copies globally on Cloudinary CDN caches
        });

        if (result.result === "ok") {
            console.log(`[Cloudinary Success] Hard-Dropped [${resourceType}]:`, publicId);
            return true;
        } else {
            console.log(`[Cloudinary Warning] Asset signature target not found [${resourceType}]:`, publicId, result);
            return false;
        }
    } catch (err) {
        console.error("Cloudinary delete execution crash process failed:", imageUrl, err.message);
        return false;
    }
};

export { cloudinary };