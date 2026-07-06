const Tiktok = require("@tobyg74/tiktok-api-dl");

export default async function handler(req, res) {
  // 1. Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const videoUrl = req.query.url || req.body?.url;

  if (!videoUrl) {
    return res.status(400).json({ 
      status: "error", 
      message: "Please provide a TikTok URL." 
    });
  }

  try {
    // 2. Try multiple versions! If one method is blocked by TikTok, try the backups.
    let result = await Tiktok.Downloader(videoUrl, { version: "v2" });
    
    if (result.status !== "success") {
      result = await Tiktok.Downloader(videoUrl, { version: "v3" });
    }
    
    if (result.status !== "success") {
      result = await Tiktok.Downloader(videoUrl, { version: "v1" });
    }

    if (result.status === "success") {
      // 3. Return the raw result so we get all the data regardless of which version worked
      return res.status(200).json({
        status: "success",
        data: result.result
      });
    } else {
      return res.status(500).json({ 
        status: "error", 
        message: "Failed to extract video. The link might be invalid, private, or TikTok is blocking the request." 
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
