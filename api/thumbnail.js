export default async function handler(req, res) {
  const { url } = req.query;

  if (!url)
    return res.status(400).send("Missing URL");

  try {

    const response = await fetch(url,{
      headers:{
        "User-Agent":
          "Mozilla/5.0",
        Referer:"https://ssstik.io/",
        Origin:"https://ssstik.io"
      }
    });

    if(!response.ok)
      return res.status(response.status).send("Image fetch failed");

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );

    res.setHeader(
      "Cache-Control",
      "public,max-age=3600,s-maxage=3600"
    );

    const buffer = Buffer.from(await response.arrayBuffer());

    res.send(buffer);

  } catch(err){
    console.error(err);
    res.status(500).send("Proxy error");
  }

}
