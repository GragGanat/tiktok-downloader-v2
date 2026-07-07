import Tiktok from "@tobyg74/tiktok-api-dl";

// Helper function to extract the highest quality video link
function extractHighestQualityVideo(data) {
  let videoLink = null;
  let videoQuality = "Unknown";

  // Priority 1: Check for explicit HD field
  if (data.videoHD && typeof data.videoHD === "string" && data.videoHD.length > 0) {
    videoLink = data.videoHD;
    videoQuality = "1080p (HD)";
    console.log("Found videoHD link");
  }
  // Priority 2: Check for SD field (usually 720p)
  else if (data.videoSD && typeof data.videoSD === "string" && data.videoSD.length > 0) {
    videoLink = data.videoSD;
    videoQuality = "720p (SD)";
    console.log("Found videoSD link");
  }
  // Priority 3: Check playAddr array (usually contains multiple quality options)
  else if (data.video?.playAddr && Array.isArray(data.video.playAddr) && data.video.playAddr.length > 0) {
    // Try to get the first link (usually highest quality)
    videoLink = data.video.playAddr[0];
    videoQuality = "720p+ (High)";
    console.log("Found video.playAddr[0] link");
  }
  // Priority 4: Check downloadAddr (sometimes contains no-watermark HD versions)
  else if (data.video?.downloadAddr && Array.isArray(data.video.downloadAddr) && data.video.downloadAddr.length > 0) {
    videoLink = data.video.downloadAddr[0];
    videoQuality = "720p+ (Download)";
    console.log("Found video.downloadAddr[0] link");
  }
  // Priority 5: Check for direct video field
  else if (data.video && typeof data.video === "string" && data.video.length > 0) {
    videoLink = data.video;
    videoQuality = "Standard";
    console.log("Found direct video link");
  }
  // Priority 6: Check for play field
  else if (data.play && typeof data.play === "string" && data.play.length > 0) {
    videoLink = data.play;
    videoQuality = "Standard";
    console.log("Found play link");
  }
  // Priority 7: Check for direct link
  else if (data.direct && typeof data.direct === "string" && data.direct.length > 0) {
    videoLink = data.direct;
    videoQuality = "Direct";
    console.log("Found direct link");
  }

  return { videoLink, videoQuality };
}

// Helper function to extract audio link
function extractAudioLink(data) {
  let audioLink = null;

  if (data.music?.playUrl && Array.isArray(data.music.playUrl) && data.music.playUrl.length > 0) {
    audioLink = data.music.playUrl[0];
  } else if (data.music?.playUrl && typeof data.music.playUrl === "string" && data.music.playUrl.length > 0) {
    audioLink = data.music.playUrl;
  } else if (data.music && typeof data.music === "string" && data.music.length > 0) {
    audioLink = data.music;
  } else if (data.audio && typeof data.audio === "string" && data.audio.length > 0) {
    audioLink = data.audio;
  }

  return audioLink;
}

// Helper function to extract thumbnail
function extractThumbnail(data) {
  let coverUrl = null;

  if (data.cover && Array.isArray(data.cover) && data.cover.length > 0) {
    coverUrl = data.cover[0];
  } else if (data.cover && typeof data.cover === "string" && data.cover.length > 0) {
    coverUrl = data.cover;
  } else if (data.video?.cover && Array.isArray(data.video.cover) && data.video.cover.length > 0) {
    coverUrl = data.video.cover[0];
  } else if (data.video?.originCover && Array.isArray(data.video.originCover) && data.video.originCover.length > 0) {
    coverUrl = data.video.originCover[0];
  } else if (data.author?.avatar && typeof data.author.avatar === "string") {
    coverUrl = data.author.avatar;
  }

  return coverUrl;
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

  // Try different versions in order of quality likelihood
  const versions = ["v3", "v2", "v1"];
  let lastError = null;

  for (const version of versions) {
    try {
      console.log(`Attempting download with version: ${version}`);

      // Call the Downloader method with the current version
      const result = await Tiktok.Downloader(url, {
        version: version,
      });

      console.log(`Response from version ${version}:`, JSON.stringify(result, null, 2));

      if (!result || result.status !== "success") {
        lastError = result?.message || `Failed with version ${version}`;
        console.log(`Version ${version} failed:`, lastError);
        continue;
      }

      const data = result.result;

      // Extract highest quality video
      const { videoLink, videoQuality } = extractHighestQualityVideo(data);

      // Extract audio
      const audioLink = extractAudioLink(data);

      // Extract thumbnail
      const coverUrl = extractThumbnail(data);

      // Extract description
      const description = data.desc || data.description || data.title || "No description";

      // Extract author
      const author = data.author?.nickname || data.author?.uniqueId || data.author || "user";

      // Check if it's a photo slideshow
      const isPhotoSlideshow = data.images && Array.isArray(data.images) && data.images.length > 0;

      console.log("Extracted data:", {
        videoLink,
        videoQuality,
        audioLink: audioLink ? "Found" : "Not found",
        coverUrl: coverUrl ? "Found" : "Not found",
        isPhotoSlideshow,
      });

      // Validate that we found at least one download option
      if (!videoLink && !audioLink && !isPhotoSlideshow) {
        lastError = "Could not extract any video, audio, or image links";
        console.log(`Version ${version} extracted no links`);
        continue;
      }

      // Return success response
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
