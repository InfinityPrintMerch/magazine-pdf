pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';

const input = document.getElementById("inputPDF");
const dragDropArea = document.getElementById("dragDropArea");
const previewContainer = document.getElementById("pdfPreviewPages");
const status = document.getElementById("status");
const convertBtn = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resolutionSelect = document.getElementById("scaleInput");
const formatSelect = document.getElementById("formatSelect");
const controlsContainer = document.querySelector(".pdf2jpg-container");

let currentPDF = null;
let images = [];

controlsContainer.style.display = "none"; // Ocultar controles al inicio

// === Drag and Drop Support ===
["dragenter", "dragover"].forEach(evt =>
    dragDropArea.addEventListener(evt, e => {
        e.preventDefault();
        dragDropArea.classList.add("dragover");
    })
);
["dragleave", "drop"].forEach(evt =>
    dragDropArea.addEventListener(evt, e => {
        e.preventDefault();
        dragDropArea.classList.remove("dragover");
    })
);
dragDropArea.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
        loadPDF(file);
    } else {
        alert("Por favor suelta un archivo PDF válido.");
    }
});

input.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
        loadPDF(file);
    }
});

// === Cargar y mostrar preview de todas las páginas ===
async function loadPDF(file) {
    const reader = new FileReader();

    convertBtn.disabled = true;
    convertBtn.textContent = "Cargando...";
    status.textContent = "Cargando PDF...";
    controlsContainer.style.display = "none";
    previewContainer.innerHTML = "";
    downloadBtn.style.display = "none";

    const loadingProgressText = document.getElementById("loadingProgressText");
    const loadingProgressContainer = document.getElementById("loadingProgressContainer");
    const loadingProgressBar = document.getElementById("loadingProgressBar");

    loadingProgressContainer.style.display = "block";
    loadingProgressText.style.display = "block";
    loadingProgressText.classList.add("fade-animate");
    loadingProgressBar.style.width = "0%";
    loadingProgressText.textContent = "Cargando PDF... 0%";

    reader.onload = async function () {
        currentPDF = await pdfjsLib.getDocument(reader.result).promise;
        const total = currentPDF.numPages;

        dragDropArea.style.display = "none";
        controlsContainer.style.display = "flex";
        images = [];

        for (let i = 1; i <= total; i++) {
            const page = await currentPDF.getPage(i);
            const viewport = page.getViewport({ scale: 0.4 });

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.classList.add("pdf2jpg-canvas");

            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

            const wrapper = document.createElement("div");
            wrapper.style.marginBottom = "12px";
            wrapper.appendChild(canvas);
            previewContainer.appendChild(wrapper);

            // Actualizar barra y texto de progreso
            const percent = Math.round((i / total) * 100);
            loadingProgressBar.style.width = `${percent}%`;
            loadingProgressText.textContent = `Cargando PDF... ${percent}%`;
        }

        status.textContent = `PDF con ${total} página(s).`;
        convertBtn.disabled = false;
        convertBtn.textContent = "Convertir";
        convertBtn.style.display = "inline-block";

        loadingProgressContainer.style.display = "none";
        loadingProgressText.style.display = "none";
        loadingProgressText.classList.remove("fade-animate");
    };

    reader.readAsArrayBuffer(file);
}



// === Convertir al presionar el botón ===
convertBtn.addEventListener("click", async () => {
    if (!currentPDF) return;

    convertBtn.disabled = true;
    convertBtn.textContent = "Convirtiendo...";
    status.textContent = "Convirtiendo páginas...";
    downloadBtn.style.display = "none";
    downloadBtn.disabled = true;

    // Mostrar barra de progreso
    const progressContainer = document.getElementById("progressContainer");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    progressContainer.style.display = "block";
    progressText.style.display = "block";
    progressBar.style.width = "0%";
    progressText.textContent = "0% completado";

    images = [];

    const scale = getScaleFromDPI(resolutionSelect.value);
    const format = formatSelect.value;
    const zip = new JSZip();
    const total = currentPDF.numPages;

    const extension = format === "jpeg" ? "jpg" : format;
    const filenameBase = `${extension}_convert`;

    for (let i = 1; i <= total; i++) {
        const page = await currentPDF.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

        const dataURL = canvas.toDataURL(`image/${format}`, 1.0);
        const base64 = dataURL.split(",")[1];

        const paddedIndex = String(i).padStart(4, "0");
        const fileName = `${filenameBase}_${paddedIndex}.${extension}`;
        zip.file(fileName, base64, { base64: true });

        // Actualizar porcentaje
        const percent = Math.round((i / total) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${percent}% completado`;
        status.textContent = `Página ${i} de ${total} convertida.`;
    }

    status.textContent = "Empaquetando en ZIP...";
    const blob = await zip.generateAsync({ type: "blob" });
    const zipURL = URL.createObjectURL(blob);

    downloadBtn.href = zipURL;
    downloadBtn.download = `${filenameBase}_zip.zip`;
    downloadBtn.style.display = "inline-block";
    downloadBtn.disabled = false;

    // Restaurar estado
    convertBtn.disabled = false;
    convertBtn.style.display = "none";
    status.textContent = "¡Listo! Descarga ahora.";
    progressText.textContent = "100% completado";

    // Opcional: Ocultar barra al final
    // progressContainer.style.display = "none";
    // progressText.style.display = "none";
});


// === Escalas DPI
function getScaleFromDPI(dpi) {
    switch (dpi) {
        case "150": return 1.5;
        case "300": return 2;
        case "600": return 3;
        case "1200": return 4;
        default: return 2;
    }
}
