const { TiktokDL } = require("@tobyg74/tiktok-api-dl");

export default async function handler(req, res) {
  // 1. Enable CORS so your frontend can talk to this API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allows any website to call this API
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Get the TikTok URL from the request query (e.g., ?url=https://www.tiktok.com/... )
  const videoUrl = req.query.url || req.body?.url;

  if (!videoUrl) {
    return res.status(400).json({ 
      status: "error", 
      message: "Please provide a TikTok URL." 
    });
  }

  try {
    // 3. Fetch the video data using the open-source library
    const result = await TiktokDL(videoUrl, {
      version: "v1" // v1 usually fetches the no-watermark video reliably
    });

    if (result.status === "success") {
      // 4. Send the clean data back to the frontend
      return res.status(200).json({
        status: "success",
        data: {
          title: result.result.description,
          author: result.result.author.nickname,
          cover: result.result.cover[0],
          video_no_watermark: result.result.video[0], // Direct MP4 link
          music: result.result.music[0]
        }
      });
    } else {
      return res.status(500).json({ 
        status: "error", 
        message: "Failed to extract video. The link might be invalid or private." 
      });
    }

  } catch (error) {
    return res.status(500).json({ 
      status: "error", 
      message: "Server error. TikTok might have updated their systems.",
      error: error.message
    });
  }
}
