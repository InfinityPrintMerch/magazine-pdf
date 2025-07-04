pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';

const inputPDF = document.getElementById('inputPDF');
const dragDropArea = document.getElementById('dragDropArea');
const previewContainer = document.getElementById('previewContainer');
const downloadBtn = document.getElementById('downloadBtn');
const progressText = document.getElementById('progressText');

let pdfDoc = null;
let pdfPages = []; // Array de objetos {pageNum, canvas}
let pdfArrayBuffer = null; // Para PDF-lib

// Función para limpiar vista previa y datos
function clearPreview() {
    previewContainer.innerHTML = '';
    pdfPages = [];
    downloadBtn.disabled = true;
    progressText.textContent = '';
}

// Renderiza una página en canvas y la agrega al contenedor con botón eliminar
async function renderPage(pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.25 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    // Contenedor para la miniatura y botón eliminar
    const container = document.createElement('div');
    container.className = 'page-thumb';
    container.setAttribute('data-page-num', pageNum);
    container.appendChild(canvas);

    const btnDelete = document.createElement('div');
    btnDelete.className = 'delete-btn';
    btnDelete.innerHTML = '&times;';
    btnDelete.title = 'Eliminar página';
    btnDelete.addEventListener('click', () => {
        container.remove();
        pdfPages = pdfPages.filter(p => p.container !== container);
        checkDownloadButton();
    });

    container.appendChild(btnDelete);
    previewContainer.appendChild(container);

    pdfPages.push({ pageNum, container });
}

// Carga y renderiza todas las páginas del PDF
async function loadPdf(arrayBuffer) {
    clearPreview();
    try {
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfArrayBuffer = arrayBuffer;

        progressText.textContent = `Cargando PDF... ${pdfDoc.numPages} páginas`;

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            await renderPage(i);
        }

        progressText.textContent = 'PDF cargado correctamente.';

        initSortable();
        checkDownloadButton();

    } catch (error) {
        console.error('Error al cargar PDF:', error);
        progressText.textContent = 'Error al cargar PDF.';
    }
}

// Habilita o deshabilita botón descargar según páginas cargadas
function checkDownloadButton() {
    downloadBtn.disabled = pdfPages.length === 0;
}

// Inicializa Sortable para drag & drop de páginas
function initSortable() {
    Sortable.create(previewContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            // Actualizar orden de pdfPages según nuevo orden DOM
            const newOrder = [];
            previewContainer.querySelectorAll('.page-thumb').forEach(elem => {
                const pageNum = parseInt(elem.getAttribute('data-page-num'));
                const pageObj = pdfPages.find(p => p.pageNum === pageNum && p.container === elem);
                if (pageObj) newOrder.push(pageObj);
            });
            pdfPages = newOrder;
        }
    });
}

// Genera PDF con nuevo orden y descarga
async function downloadReorderedPdf() {
    if (!pdfArrayBuffer || pdfPages.length === 0) return;

    progressText.textContent = 'Generando PDF...';
    downloadBtn.disabled = true;

    try {
        const pdfLibDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer);
        const newPdfDoc = await PDFLib.PDFDocument.create();

        // Copiar páginas en el orden que estén en pdfPages
        const copiedPages = await newPdfDoc.copyPages(pdfLibDoc, pdfPages.map(p => p.pageNum - 1));

        copiedPages.forEach(page => newPdfDoc.addPage(page));

        const pdfBytes = await newPdfDoc.save();

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'reordenado.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);

        progressText.textContent = 'PDF generado y descargado correctamente.';
    } catch (e) {
        console.error(e);
        progressText.textContent = 'Error al generar PDF.';
    } finally {
        downloadBtn.disabled = false;
    }
}

// Eventos

// Arrastrar y soltar para cargar PDF
dragDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragDropArea.classList.add('dragover');
});

dragDropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragDropArea.classList.remove('dragover');
});

dragDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDropArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length && files[0].type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function () {
            loadPdf(new Uint8Array(reader.result));
        }
        reader.readAsArrayBuffer(files[0]);
    } else {
        alert('Por favor, arrastra un archivo PDF válido.');
    }
});

function initSortable() {
    Sortable.create(previewContainer, {
        animation: 200,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onUpdate: (evt) => {
            // Cuando se actualiza el orden (se soltó un elemento)
            const newOrder = [];
            previewContainer.querySelectorAll('.page-thumb').forEach(elem => {
                const pageNum = parseInt(elem.getAttribute('data-page-num'));
                const pageObj = pdfPages.find(p => p.pageNum === pageNum && p.container === elem);
                if (pageObj) newOrder.push(pageObj);
            });
            pdfPages = newOrder;
        }
    });
}


// Selección manual archivo
inputPDF.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function () {
            loadPdf(new Uint8Array(reader.result));
        }
        reader.readAsArrayBuffer(file);
    } else {
        alert('Por favor, selecciona un archivo PDF válido.');
    }
});

downloadBtn.addEventListener('click', downloadReorderedPdf);