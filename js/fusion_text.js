// Configura PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// IMPORTANTE: pdf-lib y fontkit deben estar cargados globalmente (desde CDN o localmente)
// No llames a PDFDocument.registerFontkit como función estática, sino en la instancia.

// Elementos DOM
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const textOverlay = document.getElementById('textOverlay');
const uploadArea = document.getElementById('uploadArea');
const pdfInput = document.getElementById('pdfInput');
const editorSection = document.getElementById('editorSection');

let pdfDoc = null; // Para pdf.js (visualización)
let scale = 1;

uploadArea.addEventListener('click', () => pdfInput.click());
uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) handlePDFUpload(e.dataTransfer.files[0]);
});
pdfInput.addEventListener('change', e => {
    if (e.target.files.length) handlePDFUpload(e.target.files[0]);
});

async function handlePDFUpload(file) {
    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdfDoc.getPage(1);

    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = viewport.width + "px";
    canvas.style.height = viewport.height + "px";

    const wrapper = canvas.parentElement;
    if (wrapper) {
        wrapper.style.width = viewport.width + "px";
        wrapper.style.height = viewport.height + "px";
    }

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Centrar texto inicialmente
    textOverlay.style.left = `${viewport.width / 2 - 50}px`;
    textOverlay.style.top = `${viewport.height / 2 - 20}px`;

    const fontSizeInput = document.getElementById('fontSize');
    const fontSelect = document.getElementById('fontSelect');
    const fontColorInput = document.getElementById('fontColor');

    if (fontSizeInput) textOverlay.style.fontSize = fontSizeInput.value + 'px';
    if (fontSelect) textOverlay.style.fontFamily = fontSelect.value;
    if (fontColorInput) textOverlay.style.color = fontColorInput.value;

    editorSection.style.display = 'block';
}

// Drag & drop texto
let dragging = false, startX = 0, startY = 0;
textOverlay.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX - textOverlay.offsetLeft;
    startY = e.clientY - textOverlay.offsetTop;
    e.preventDefault();
});
document.addEventListener('mousemove', e => {
    if (!dragging) return;
    textOverlay.style.left = `${e.clientX - startX}px`;
    textOverlay.style.top = `${e.clientY - startY}px`;
});
document.addEventListener('mouseup', () => dragging = false);

// Cambios de estilo en tiempo real
const fontSelect = document.getElementById('fontSelect');
const fontSizeInput = document.getElementById('fontSize');
const fontColorInput = document.getElementById('fontColor');

if (fontSelect) {
    fontSelect.addEventListener('change', e => {
        textOverlay.style.fontFamily = e.target.value;
    });
}
if (fontSizeInput) {
    fontSizeInput.addEventListener('input', e => {
        textOverlay.style.fontSize = e.target.value + 'px';
    });
}
if (fontColorInput) {
    fontColorInput.addEventListener('input', e => {
        textOverlay.style.color = e.target.value;
    });
}

// Carga fuente .ttf desde ruta
async function loadFontBytes(fontFilePath) {
    const response = await fetch(fontFilePath);
    if (!response.ok) throw new Error('No se pudo cargar la fuente: ' + fontFilePath);
    return await response.arrayBuffer();
}

// Generar PDF con nombres
document.getElementById('generateBtn').addEventListener('click', async () => {
    if (!pdfDoc) {
        alert('Primero carga un PDF.');
        return;
    }

    const namesRaw = document.getElementById('nameList').value.trim();
    if (!namesRaw) {
        alert('Ingresa al menos un nombre.');
        return;
    }
    const names = namesRaw.split('\n').filter(n => n.trim());

    const fontName = fontSelect.value;
    const fontSize = parseInt(fontSizeInput.value);
    const colorHex = fontColorInput.value;
    const color = hexToRgb(colorHex);

    if (!(fontName in fontMap)) {
        alert('Fuente no soportada. Selecciona una válida.');
        return;
    }

    try {
        const fontBytes = await loadFontBytes(fontMap[fontName]);
        const originalBytes = await pdfDoc.getData();

        // Crear documento nuevo
        const pdfNewDoc = await PDFLib.PDFDocument.create();

        // Registrar fontkit en la instancia
        pdfNewDoc.registerFontkit(fontkit);

        // Embed el PDF original como plantilla
        const [template] = await pdfNewDoc.embedPdf(originalBytes);

        // Embed la fuente custom
        const font = await pdfNewDoc.embedFont(fontBytes);

        // Posición relativa del texto sobre canvas
        const overlayRect = textOverlay.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const relativeX = overlayRect.left - canvasRect.left;
        const relativeY = overlayRect.top - canvasRect.top;

        // Coordenadas PDF (origen abajo-izquierda)
        const xPDF = relativeX;
        const yPDF = canvas.height - (relativeY + fontSize);

        for (const name of names) {
            const page = pdfNewDoc.addPage([template.width, template.height]);
            page.drawPage(template);
            page.drawText(name, {
                x: xPDF,
                y: yPDF,
                size: fontSize,
                font,
                color: PDFLib.rgb(color.r / 255, color.g / 255, color.b / 255)
            });
        }

        const finalBytes = await pdfNewDoc.save();
        const blob = new Blob([finalBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.getElementById('downloadLink');
        link.href = url;
        link.style.display = 'inline-block';

    } catch (error) {
        alert('Error generando PDF: ' + error.message);
        console.error(error);
    }
});

// Convertir hex a RGB
function hexToRgb(hex) {
    if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
        return { r: 0, g: 0, b: 0 };
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[1] + hex[1], 16),
            g: parseInt(hex[2] + hex[2], 16),
            b: parseInt(hex[3] + hex[3], 16)
        };
    }
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

document.getElementById('pdfInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
        document.getElementById('uploadArea').style.display = 'none';
    }
});
