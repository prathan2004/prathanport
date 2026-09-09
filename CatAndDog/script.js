const modelUrlInput = document.querySelector("#model-url");
const loadModelButton = document.querySelector("#load-model");
const modelStatus = document.querySelector("#model-status");
const imageUpload = document.querySelector("#image-upload");
const previewArea = document.querySelector(".preview-area");
const previewImage = document.querySelector("#preview-image");
const predictButton = document.querySelector("#predict-button");
const clearButton = document.querySelector("#clear-button");
const topResult = document.querySelector("#top-result");
const resultNote = document.querySelector("#result-note");
const predictionsBox = document.querySelector("#predictions");

let model = null;
let selectedImageLoaded = false;

const savedModelUrl = localStorage.getItem("teachableMachineModelUrl");
if (savedModelUrl) {
  modelUrlInput.value = savedModelUrl;
}

function normalizeModelUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function setStatus(message, type = "") {
  modelStatus.textContent = message;
  modelStatus.className = `status ${type}`.trim();
}

function updatePredictState() {
  predictButton.disabled = !model || !selectedImageLoaded;
}

async function loadModel() {
  const baseUrl = normalizeModelUrl(modelUrlInput.value);

  if (!baseUrl) {
    setStatus("กรุณาวาง Model URL ก่อนโหลดโมเดล", "error");
    return;
  }

  setStatus("กำลังโหลดโมเดล...");
  loadModelButton.disabled = true;

  try {
    model = await tmImage.load(`${baseUrl}model.json`, `${baseUrl}metadata.json`);
    localStorage.setItem("teachableMachineModelUrl", baseUrl);
    setStatus(`โหลดโมเดลสำเร็จ (${model.getTotalClasses()} คลาส)`, "ready");
    topResult.textContent = selectedImageLoaded ? "พร้อมทำนายภาพ" : "โหลดโมเดลแล้ว";
    resultNote.textContent = selectedImageLoaded
      ? "กดทำนายภาพเพื่อดูผลลัพธ์"
      : "เลือกรูปภาพสัตว์เพื่อเริ่มทำนาย";
  } catch (error) {
    model = null;
    setStatus("โหลดโมเดลไม่สำเร็จ ตรวจสอบ URL หรือการ Export แบบ TensorFlow.js", "error");
    console.error(error);
  } finally {
    loadModelButton.disabled = false;
    updatePredictState();
  }
}

function showSelectedImage(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    previewImage.src = reader.result;
    previewArea.classList.add("has-image");
    selectedImageLoaded = true;
    topResult.textContent = model ? "พร้อมทำนายภาพ" : "รอโหลดโมเดล";
    resultNote.textContent = model
      ? "กดทำนายภาพเพื่อดูผลลัพธ์"
      : "วาง Model URL แล้วกดโหลดโมเดลก่อน";
    predictionsBox.innerHTML = "";
    updatePredictState();
  });
  reader.readAsDataURL(file);
}

function renderPredictions(predictions) {
  predictionsBox.innerHTML = "";

  predictions.forEach((prediction) => {
    const percent = prediction.probability * 100;
    const row = document.createElement("div");
    row.className = "prediction-row";

    row.innerHTML = `
      <div class="prediction-label">
        <span>${prediction.className}</span>
        <span>${percent.toFixed(1)}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${percent}%"></div>
      </div>
    `;

    predictionsBox.appendChild(row);
  });
}

async function predictImage() {
  if (!model || !selectedImageLoaded) {
    return;
  }

  predictButton.disabled = true;
  predictButton.textContent = "กำลังทำนาย...";

  try {
    const predictions = await model.predict(previewImage);
    predictions.sort((a, b) => b.probability - a.probability);

    const best = predictions[0];
    topResult.textContent = best.className;
    resultNote.textContent = `โมเดลมั่นใจ ${(best.probability * 100).toFixed(1)}%`;
    renderPredictions(predictions);
  } catch (error) {
    topResult.textContent = "ทำนายไม่สำเร็จ";
    resultNote.textContent = "ลองเลือกรูปใหม่ หรือโหลดโมเดลอีกครั้ง";
    console.error(error);
  } finally {
    predictButton.textContent = "ทำนายภาพ";
    updatePredictState();
  }
}

function clearImage() {
  imageUpload.value = "";
  previewImage.removeAttribute("src");
  previewArea.classList.remove("has-image");
  selectedImageLoaded = false;
  predictionsBox.innerHTML = "";
  topResult.textContent = model ? "โหลดโมเดลแล้ว" : "รอรูปภาพและโมเดล";
  resultNote.textContent = model
    ? "เลือกรูปภาพสัตว์เพื่อเริ่มทำนาย"
    : "ผลลัพธ์จะแสดงคลาสที่มั่นใจที่สุด พร้อมเปอร์เซ็นต์ของทุกคลาสในโมเดล";
  updatePredictState();
}

loadModelButton.addEventListener("click", loadModel);
imageUpload.addEventListener("change", (event) => showSelectedImage(event.target.files[0]));
predictButton.addEventListener("click", predictImage);
clearButton.addEventListener("click", clearImage);
