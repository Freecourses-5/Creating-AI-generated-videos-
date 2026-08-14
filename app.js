const form = document.getElementById("videoForm");
const btn = document.getElementById("generateBtn");
const btnText = document.getElementById("btnText");
const spinner = document.getElementById("spinner");
const statusBox = document.getElementById("status");
const result = document.getElementById("result");
const video = document.getElementById("video");
const download = document.getElementById("download");

function setBusy(busy) {
  btn.disabled = busy;
  btnText.textContent = busy ? "جاري إنشاء الفيديو..." : "إنشاء الفيديو";
  spinner.classList.toggle("hidden", !busy);
}

function showStatus(text) {
  statusBox.textContent = text;
  statusBox.classList.remove("hidden");
}

async function pollJob(jobId) {
  for (;;) {
    const response = await fetch(`/api/jobs/${jobId}`);
    const data = await response.json();

    if (!response.ok || data.status === "error") {
      throw new Error(data.error || "فشل إنشاء الفيديو.");
    }

    if (data.status === "completed") return data.videoUrl;

    showStatus("Veo يقوم بإنشاء الفيديو الآن… قد تستغرق العملية بعض الوقت.");
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  result.classList.add("hidden");
  setBusy(true);
  showStatus("جاري إرسال الطلب إلى Veo…");

  try {
    const formData = new FormData(form);
    const response = await fetch("/api/generate", {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "تعذر بدء التوليد.");

    const videoUrl = await pollJob(data.jobId);
    video.src = videoUrl;
    download.href = videoUrl;
    result.classList.remove("hidden");
    showStatus("تم إنشاء الفيديو بنجاح.");
    video.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    showStatus(`خطأ: ${error.message}`);
  } finally {
    setBusy(false);
  }
});