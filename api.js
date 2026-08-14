export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({error:"GEMINI_API_KEY غير مضبوط في Vercel."});

  const op = req.query.op;
  const base = "https://generativelanguage.googleapis.com/v1beta";

  try {
    if (op === "generate" && req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const prompt = String(body?.prompt || "").trim();
      if (!prompt) return res.status(400).json({error:"الوصف مطلوب."});

      const instance = {prompt};
      if (body.imageBase64) {
        instance.image = {
          inlineData: {
            mimeType: body.mimeType || "image/jpeg",
            data: body.imageBase64
          }
        };
      }

      const response = await fetch(
        base + "/models/veo-3.1-fast-generate-preview:predictLongRunning",
        {
          method:"POST",
          headers:{
            "x-goog-api-key":key,
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            instances:[instance],
            parameters:{
              aspectRatio: body.aspectRatio === "16:9" ? "16:9" : "9:16",
              resolution:"720p",
              numberOfVideos:1
            }
          })
        }
      );

      const data = await response.json();
      if (!response.ok)
        return res.status(response.status).json({
          error:data?.error?.message || "فشل بدء Veo."
        });

      return res.status(200).json({operationName:data.name});
    }

    if (op === "status") {
      const operation = req.query.operation;
      if (!operation) return res.status(400).json({error:"operation مطلوب."});

      const response = await fetch(base + "/" + operation, {
        headers:{"x-goog-api-key":key}
      });
      const data = await response.json();

      if (!response.ok)
        return res.status(response.status).json({
          status:"error",
          error:data?.error?.message || "تعذر فحص العملية."
        });

      if (!data.done) return res.status(200).json({status:"processing"});
      if (data.error)
        return res.status(200).json({
          status:"error",
          error:data.error.message || "فشل Veo."
        });

      const uri =
        data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

      if (!uri)
        return res.status(200).json({
          status:"error",
          error:"لم يتم العثور على الفيديو في نتيجة Veo."
        });

      return res.status(200).json({status:"completed", videoUri:uri});
    }

    if (op === "video") {
      const uri = req.query.uri;
      if (!uri || !uri.startsWith("https://generativelanguage.googleapis.com/"))
        return res.status(400).send("رابط غير صالح.");

      const response = await fetch(uri, {
        headers:{"x-goog-api-key":key}
      });

      if (!response.ok) return res.status(response.status).send("تعذر تحميل الفيديو.");

      res.setHeader("Content-Type", response.headers.get("content-type") || "video/mp4");
      res.setHeader("Cache-Control", "private, max-age=3600");
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.status(200).send(buffer);
    }

    return res.status(404).json({error:"Not found"});
  } catch (error) {
    return res.status(500).json({error:error.message || "حدث خطأ غير متوقع."});
  }
}