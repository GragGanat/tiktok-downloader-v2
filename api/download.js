import Tiktok from "@tobyg74/tiktok-api-dl";

// Helper function to extract video data from result
function extractVideoData(data) {
  let videoLink = null;
  let videoQuality = "Unknown";

  // Priority 1: Check for HD-specific fields
  if (data.videoHD) {
    videoLink = data.videoHD;
    videoQuality = "1080p (HD)";
  }
  // Priority 2: Check for SD video
  else if (data.videoSD) {
    videoLink = data.videoSD;
    videoQuality = "720p (SD)";
  }
  // Priority 3: Check video.playAddr array
  else if (data.video?.playAddr && Array.isArray(data.video.playAddr)) {
    videoLink = data.video.playAddr[0];
    videoQuality = "720p+ (High)";
  }
  // Priority 4: Check video.downloadAddr
  else if (data.video?.downloadAddr && Array.isArray(data.video.downloadAddr)) {
    videoLink = data.video.downloadAddr[0];
    videoQuality = "720p+ (Download)";
  }
  // Priority 5: Direct video field
  else if (data.video && typeof data.video === "string") {
    videoLink = data.video;
    videoQuality = "Standard";
  }
  // Priority 6: Direct link
  else if (data.direct) {
    videoLink = data.direct;
    videoQuality = "Direct";
  }

  // Extract audio link
  let audioLink = null;
  if (data.music?.playUrl && Array.isArray(data.music.playUrl)) {
    audioLink = data.music.playUrl[0];
  } else if (data.music?.playUrl && typeof data.music.playUrl === "string") {
    audioLink = data.music.playUrl;
  } else if (data.music && typeof data.music === "string") {
    audioLink = data.music;
  }

  // Extract thumbnail
  let coverUrl = null;
  if (data.cover && Array.isArray(data.cover)) {
    coverUrl = data.cover[0];
  } else if (data.video?.cover && Array.isArray(data.video.cover)) {
    coverUrl = data.video.cover[0];
  } else if (data.video?.originCover && Array.isArray(data.video.originCover)) {
    coverUrl = data.video.originCover[0];
  } else if (data.author?.avatar) {
    coverUrl = data.author.avatar;
  }

  // Extract description
  const description = data.desc || data.description || "No description";

  // Extract author
  const author = data.author?.nickname || data.author?.uniqueId || data.author || "user";

  // Check if it's a photo slideshow
  const isPhotoSlideshow = data.images && Array.isArray(data.images) && data.images.length > 0;

  return {
    video: videoLink,
    videoQuality: videoQuality,
    audio: audioLink,
    cover: coverUrl,
    title: description,
    author: author,
    desc: description,
    images: data.images || [],
    isPhotoSlideshow: isPhotoSlideshow,
  };
}

// Main handler
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: "error",
      message: "URL parameter is required",
    });
  }

  // Try different versions in order of reliability
  const versions = ["v3", "v2", "v1"];
  let lastError = null;

  for (const version of versions) {
    try {
      console.log(`Attempting download with version: ${version}`);

      // Call the Downloader method with the current version
      const result = await Tiktok.Downloader(url, {
        version: version,
      });

      console.log(`Success with version ${version}:`, result);

      if (!result || result.status !== "success") {
        lastError = result?.message || `Failed with version ${version}`;
        console.log(`Version ${version} failed:`, lastError);
        continue; // Try next version
      }

      const data = result.result;
      const videoData = extractVideoData(data);

      // Return success response
      return res.status(200).json({
        status: "success",
        data: videoData,
      });
    } catch (error) {
      lastError = error.message;
      console.error(`Error with version ${version}:`, error.message);

      // If it's a 403, try the next version
      if (error.message.includes("403")) {
        console.log(`Version ${version} got 403, trying next version...`);
        continue;
      }

      // For other errors, continue to next version
      continue;
    }
  }

  // If all versions failed, return error
  console.error("All versions failed. Last error:", lastError);
  return res.status(500).json({
    status: "error",
    message: "Server error. TikTok might have updated their systems or blocked this request.",
    error: lastError || "Unknown error",
  });
}
