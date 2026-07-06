const Tiktok = require("@tobyg74/tiktok-api-dl");

export default async function handler(req, res) {
  // 1. Enable CORS so your frontend can talk to this API
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
    // 2. Use the correct updated function name: Tiktok.Downloader
    const result = await Tiktok.Downloader(videoUrl, {
      version: "v1" 
    });

    if (result.status === "success") {
      return res.status(200).json({
        status: "success",
        data: {
          title: result.result.description,
          author: result.result.author.nickname,
          cover: result.result.cover[0],
          video_no_watermark: result.result.video[0], 
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
