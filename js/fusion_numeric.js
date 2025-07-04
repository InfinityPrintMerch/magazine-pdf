const inch = 72;
const pageSizes = {
    LETTER: [8.5 * inch, 11 * inch],
    TABLOID: [11 * inch, 17 * inch],
    EXTRATABLOID: [13 * inch, 19 * inch]
};

let renderedBaseImage = null; // Imagen renderizada del PDF base
let pdfBaseBytes = null;
let originalPageSize = [0, 0]; // ancho, alto en puntos PDF
let previewScale = 1; // Escala visual del canvas de acomodo
let draggable = document.getElementById("draggable-number");

document.getElementById("pdfFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        pdfBaseBytes = reader.result;

        const pdf = await pdfjsLib.getDocument({ data: pdfBaseBytes }).promise;
        const page = await pdf.getPage(1);

        originalPreview.style.display = "block";
        layoutPreview.style.display = "none";
        togglePreviewBtn.textContent = "Mostrar acomodo";


        document.getElementById("dragDropLabel").style.display = "none";
        document.getElementById("contenidoPDF").style.display = "block";


        document.getElementById("contenidoPDF").style.display = "block";

        const viewport = page.getViewport({ scale: 2 });

        // Tamaño original en puntos PDF
        originalPageSize = [page.view[2], page.view[3]];

        // Mostrar original en canvas
        const canvas = document.getElementById("originalCanvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const width = page.view[2];
        const height = page.view[3];

        // Validar tamaño exacto: 4.25x5.5 pulgadas = 306 x 396 pt
        if (!(Math.abs(width - 306) < 2 && Math.abs(height - 396) < 2) &&
            !(Math.abs(width - 396) < 2 && Math.abs(height - 306) < 2)) {
            alert("⚠️ El PDF debe tener un tamaño de 4.25 x 5.5 pulgadas (306x396 pt). El archivo seleccionado mide aproximadamente " +
                `${(width / 72).toFixed(2)} x ${(height / 72).toFixed(2)} pulgadas.`);
            return;
        }


        // Renderizar página original como imagen para vista previa de acomodo
        const offCanvas = document.createElement("canvas");
        offCanvas.width = viewport.width;
        offCanvas.height = viewport.height;
        const offCtx = offCanvas.getContext("2d");
        await page.render({ canvasContext: offCtx, viewport }).promise;

        renderedBaseImage = new Image();
        renderedBaseImage.src = offCanvas.toDataURL();
        renderedBaseImage.onload = () => {
            renderLayoutPreview(); // Actualiza previsualización cuando la imagen esté lista
        };



        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;

        renderLayoutPreview();
    };
    reader.readAsArrayBuffer(file);
});

document.getElementById("copiesPerPage").addEventListener("input", renderLayoutPreview);
document.getElementById("pageSize").addEventListener("change", renderLayoutPreview);

// Previsualización del acomodo
async function renderLayoutPreview() {
    if (!pdfBaseBytes || originalPageSize[0] === 0) return;

    const copiesPerPage = parseInt(document.getElementById("copiesPerPage").value || "1");
    const pageSizeKey = document.getElementById("pageSize").value;
    let [sheetW, sheetH] = pageSizes[pageSizeKey];
    const orientation = document.getElementById("orientation").value;
    if (orientation === "landscape") {
        [sheetW, sheetH] = [sheetH, sheetW];
    }

    const layoutCanvas = document.getElementById("layoutCanvas");
    const ctx = layoutCanvas.getContext("2d");

    // Ajustamos el tamaño del canvas a proporción real (con margen)
    previewScale = Math.min(layoutCanvas.width / sheetW, layoutCanvas.height / sheetH);
    const viewW = sheetW * previewScale;
    const viewH = sheetH * previewScale;

    ctx.clearRect(0, 0, layoutCanvas.width, layoutCanvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, viewW, viewH);

    const cols = Math.ceil(Math.sqrt(copiesPerPage));
    const rows = Math.ceil(copiesPerPage / cols);

    const gap = parseFloat(document.getElementById("copyMargin").value || "0");
    const scaledW = (viewW - (cols + 1) * gap) / cols;
    const scaledH = (viewH - (rows + 1) * gap) / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (idx >= copiesPerPage) break;

            const x = gap + c * (scaledW + gap);
            const y = gap + r * (scaledH + gap);

            if (renderedBaseImage) {
                ctx.drawImage(renderedBaseImage, x, y, scaledW, scaledH);
            } else {
                ctx.fillStyle = "#e0e0e0";
                ctx.fillRect(x, y, scaledW, scaledH);
            }
            ctx.strokeStyle = "#555";
            ctx.strokeRect(x, y, scaledW, scaledH);


            // En la primera copia mostramos el número draggable
            if (idx === 0) {
                draggable.style.left = `${x + 20}px`;
                draggable.style.top = `${y + 20}px`;
                draggable.style.display = "block";
            }
        }
    }
}

document.getElementById("generateBtn").addEventListener("click", async () => {
    if (!pdfBaseBytes || originalPageSize[0] === 0) return alert("Primero selecciona un PDF.");

    const start = parseInt(document.getElementById("startNumber").value);
    const end = parseInt(document.getElementById("endNumber").value);
    if (isNaN(start) || isNaN(end) || start > end) return alert("Intervalo inválido.");

    const copiesPerPage = parseInt(document.getElementById("copiesPerPage").value || "1");
    const pageSizeKey = document.getElementById("pageSize").value;
    let [sheetW, sheetH] = pageSizes[pageSizeKey];
    const orientation = document.getElementById("orientation").value;
    if (orientation === "landscape") {
        [sheetW, sheetH] = [sheetH, sheetW]; // intercambia ancho/alto
    }


    const cols = Math.ceil(Math.sqrt(copiesPerPage));
    const rows = Math.ceil(copiesPerPage / cols);

    const usableW = sheetW;
    const usableH = sheetH;
    const spacing = parseFloat(document.getElementById("copyMargin").value || "0");

    const scaleW = (usableW - (cols + 1) * spacing) / cols;
    const scaleH = (usableH - (rows + 1) * spacing) / rows;

    const scaleX = scaleW / originalPageSize[0];
    const scaleY = scaleH / originalPageSize[1];
    const finalScale = Math.min(scaleX, scaleY);

    // Posición del número draggable en canvas
    const layoutCanvas = document.getElementById("layoutCanvas");
    const drag = document.getElementById("draggable-number");
    const dragX = parseFloat(drag.style.left);
    const dragY = parseFloat(drag.style.top);

    // Escalar a puntos reales
    const relativeX = dragX / previewScale;
    const relativeY = dragY / previewScale;

    const pdfDoc = await PDFLib.PDFDocument.create();
    const baseDoc = await PDFLib.PDFDocument.load(pdfBaseBytes);
    const basePage = baseDoc.getPage(0);
    const embeddedPage = await pdfDoc.embedPage(basePage);

    const rotation = parseInt(document.getElementById("pdfRotation").value || "0");
    const rotateRad = (rotation * Math.PI) / 180;


    let number = start;

    while (number <= end) {
        const page = pdfDoc.addPage([sheetW, sheetH]);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (number > end) break;

                const x = spacing + c * (originalPageSize[0] * finalScale + spacing);
                const y = sheetH - spacing - (r + 1) * (originalPageSize[1] * finalScale) - r * spacing;

                // Dibujar la copia con rotación del PDF base
                page.drawPage(embeddedPage, {
                    x,
                    y,
                    xScale: finalScale,
                    yScale: finalScale,
                    rotate: PDFLib.degrees(rotation)
                });


                // Dibuja el número
                const numX = x + (relativeX * finalScale);
                const numY = y + (originalPageSize[1] * finalScale - relativeY * finalScale);
                page.drawText(`${number}`, {
                    x: numX,
                    y: numY,
                    size: 12,
                    color: PDFLib.rgb(1, 0, 0)
                });

                number++;
            }
        }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fusion_numerica.pdf';
    a.click();
    URL.revokeObjectURL(url);

    document.getElementById("status").textContent = "✅ PDF generado correctamente.";
});

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

const layoutContainer = document.getElementById("layoutCanvasContainer");

draggable.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = draggable.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const containerRect = layoutContainer.getBoundingClientRect();
    let x = e.clientX - containerRect.left - dragOffsetX;
    let y = e.clientY - containerRect.top - dragOffsetY;

    // Limitar dentro del canvas
    const canvas = document.getElementById("layoutCanvas");
    x = Math.max(0, Math.min(x, canvas.width - draggable.offsetWidth));
    y = Math.max(0, Math.min(y, canvas.height - draggable.offsetHeight));

    draggable.style.left = `${x}px`;
    draggable.style.top = `${y}px`;
});

document.addEventListener("mouseup", () => {
    isDragging = false;
});

const dragDropLabel = document.getElementById("dragDropLabel");
const pdfInput = document.getElementById("pdfFile");

// Click en el área para abrir el diálogo de archivos
dragDropLabel.addEventListener("click", () => {
    pdfInput.click();
});

// Evitar comportamiento por defecto al arrastrar
["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dragDropLabel.addEventListener(eventName, e => e.preventDefault());
    dragDropLabel.addEventListener(eventName, e => e.stopPropagation());
});

// Estilo visual al arrastrar
dragDropLabel.addEventListener("dragover", () => {
    dragDropLabel.classList.add("dragover");
});

dragDropLabel.addEventListener("dragleave", () => {
    dragDropLabel.classList.remove("dragover");
});

dragDropLabel.addEventListener("drop", (e) => {
    dragDropLabel.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        pdfInput.files = files; // Asigna los archivos al input
        const event = new Event("change"); // Dispara evento 'change'
        pdfInput.dispatchEvent(event);
    }
});

const originalPreview = document.getElementById("originalPreviewContainer");
const layoutPreview = document.getElementById("layoutPreviewContainer");
const togglePreviewBtn = document.getElementById("togglePreviewBtn");

togglePreviewBtn.addEventListener("click", () => {
    const isOriginalVisible = originalPreview.style.display !== "none";

    if (isOriginalVisible) {
        originalPreview.style.display = "none";
        layoutPreview.style.display = "block";
        togglePreviewBtn.textContent = "Mostrar original";
    } else {
        originalPreview.style.display = "block";
        layoutPreview.style.display = "none";
        togglePreviewBtn.textContent = "Mostrar acomodo";
    }
});
