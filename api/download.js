import TiktokDL from "@tobyg74/tiktok-api-dl";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: "error",
      message: "URL parameter is required",
    });
  }

  try {
    // Initialize TiktokDL - use the default export correctly
    const tiktok = new TiktokDL();

    // Download video data
    const result = await tiktok.download(url);

    console.log("API Result:", result);

    if (!result || result.status !== "success") {
      return res.status(400).json({
        status: "error",
        message: result?.message || "Failed to extract video",
      });
    }

    const data = result.result;

    // Extract video link with HD priority
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
    // Priority 3: Check video.playAddr array (highest resolution first)
    else if (data.video?.playAddr && Array.isArray(data.video.playAddr)) {
      videoLink = data.video.playAddr[0];
      videoQuality = "720p+ (High)";
    }
    // Priority 4: Check video.downloadAddr (alternative source)
    else if (data.video?.downloadAddr && Array.isArray(data.video.downloadAddr)) {
      videoLink = data.video.downloadAddr[0];
      videoQuality = "720p+ (Download)";
    }
    // Priority 5: Check direct video field
    else if (data.video && typeof data.video === "string") {
      videoLink = data.video;
      videoQuality = "Standard";
    }
    // Priority 6: Check for direct link
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

    // Return response with quality information
    return res.status(200).json({
      status: "success",
      data: {
        video: videoLink,
        videoQuality: videoQuality,
        audio: audioLink,
        cover: coverUrl,
        title: description,
        author: author,
        desc: description,
        images: data.images || [],
        isPhotoSlideshow: isPhotoSlideshow,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error. TikTok might have updated their systems.",
      error: error.message,
    });
  }
}
