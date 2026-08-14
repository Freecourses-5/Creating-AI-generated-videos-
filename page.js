"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("9:16");
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function createVideo() {
    if (!prompt.trim()) {
      setStatus("اكتب وصف الفيديو أولًا.");
      return;
    }

    setBusy(true);
    setVideoUrl("");
    setStatus("جاري إرسال الطلب إلى Veo…");

    try {
      const payload = { prompt: prompt.trim(), aspectRatio: ratio };

      if (image) {
        if (image.size > 3 * 1024 * 1024) {
          throw new Error("حجم الصورة يجب أن يكون أقل من 3MB.");
        }
        payload.imageBase64 = await fileToBase64(image);
        payload.mimeType = image.type;
      }

      const start = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await start.json();
      if (!start.ok) throw new Error(data.error || "تعذر بدء التوليد.");

      const operation = data.operationName;

      for (;;) {
        await new Promise(r => setTimeout(r, 6000));
        setStatus("Veo يقوم بإنشاء الفيديو…");

        const check = await fetch(
          "/api/status?operation=" + encodeURIComponent(operation),
          { cache: "no-store" }
        );
        const result = await check.json();

        if (!check.ok || result.status === "error") {
          throw new Error(result.error || "فشل إنشاء الفيديو.");
        }

        if (result.status === "completed") {
          const url = "/api/video?uri=" + encodeURIComponent(result.videoUri);
          setVideoUrl(url);
          setStatus("تم إنشاء الفيديو بنجاح.");
          break;
        }
      }
    } catch (error) {
      setStatus("خطأ: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header>
        <div className="brand"><span>✦</span> Veo Studio</div>
        <div className="tag">Gemini + Veo</div>
      </header>

      <section className="hero">
        <small>AI VIDEO GENERATOR</small>
        <h1>أنشئ فيديو بالذكاء الاصطناعي</h1>
        <p>اكتب فكرتك، اختر المقاس، ويمكنك إضافة صورة مرجعية.</p>
      </section>

      <section className="card">
        <label>وصف الفيديو</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="مثال: لقطة سينمائية لمدينة القاهرة ليلًا بعد المطر، انعكاسات الأضواء على الشوارع، حركة كاميرا بطيئة وواقعية..."
          maxLength={5000}
        />

        <div className="grid">
          <div>
            <label>مقاس الفيديو</label>
            <select value={ratio} onChange={e => setRatio(e.target.value)}>
              <option value="9:16">9:16 — عمودي</option>
              <option value="16:9">16:9 — أفقي</option>
            </select>
          </div>
          <div>
            <label>النموذج</label>
            <div className="field">Veo 3.1 Fast</div>
          </div>
        </div>

        <label>صورة مرجعية <span>(اختياري)</span></label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={e => setImage(e.target.files?.[0] || null)}
        />

        <button disabled={busy} onClick={createVideo}>
          {busy ? "جاري إنشاء الفيديو…" : "إنشاء الفيديو"}
        </button>

        {status && <div className="status">{status}</div>}

        {videoUrl && (
          <div className="result">
            <h2>الفيديو جاهز 🎬</h2>
            <video src={videoUrl} controls playsInline />
            <a className="download" href={videoUrl} download="ai-video.mp4">
              تحميل الفيديو
            </a>
          </div>
        )}
      </section>
    </main>
  );
}