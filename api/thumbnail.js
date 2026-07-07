export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'No image URL provided' });
    }

    try {
        // Fetch the image from TikTok pretending to be a real browser
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.tiktok.com/',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            }
        } );

        if (!response.ok) {
            throw new Error(`TikTok server responded with ${response.status}`);
        }

        // Get the image data
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Get the correct image type (usually image/jpeg or image/webp)
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Send the image to the frontend and cache it for 24 hours to save bandwidth
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buffer);

    } catch (error) {
        console.error('Thumbnail proxy error:', error.message);
        // If it fails, redirect to a fallback placeholder image
        res.redirect('https://via.placeholder.com/300x400/111827/ffffff?text=No+Preview' );
    }
}
