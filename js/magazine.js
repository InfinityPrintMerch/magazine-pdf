const { PDFDocument, degrees } = PDFLib;

// Generar pares según patrón pedido
function generarPares(totalPaginas) {
    const pares = [];
    let i = 1;
    let j = totalPaginas;
    let offset = 0;

    while (i + offset <= j - offset) {
        if (j - offset >= i + offset) {
            pares.push([j - offset, i + offset]);
        }
        if (i + offset + 1 <= j - offset - 1) {
            pares.push([i + offset + 1, j - offset - 1]);
        }
        offset += 2;
    }
    return pares;
}

const dragDropArea = document.getElementById('dragDropArea');
const inputPDF = document.getElementById('inputPDF');
const procesarBtn = document.getElementById('procesarBtn');
const descargarLink = document.getElementById('descargar');
const previewContainer = document.getElementById('previewContainer');

let pdfBytesProcesado = null;

// Manejo drag & drop
dragDropArea.addEventListener('dragover', e => {
    e.preventDefault();
    dragDropArea.classList.add('dragover');
});

dragDropArea.addEventListener('dragleave', e => {
    e.preventDefault();
    dragDropArea.classList.remove('dragover');
});

dragDropArea.addEventListener('drop', e => {
    e.preventDefault();
    dragDropArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        if (file.type !== 'application/pdf') {
            alert('Por favor, selecciona un archivo PDF válido.');
            return;
        }
        cargarArchivo(file);
    }
});

// Al seleccionar archivo con input
inputPDF.addEventListener('change', () => {
    if (inputPDF.files.length) {
        const file = inputPDF.files[0];
        if (file.type !== 'application/pdf') {
            alert('Por favor, selecciona un archivo PDF válido.');
            return;
        }
        cargarArchivo(file);
    }
});

function cargarArchivo(file) {
    procesarBtn.style.display = 'inline-block'; // ← muestra el botón
    procesarBtn.disabled = false;
    descargarLink.style.display = 'none';
    previewContainer.innerHTML = '';
    pdfBytesProcesado = null;
    archivoSeleccionado = file;

    // Ocultar drag & drop
    dragDropArea.style.display = 'none';
}



let archivoSeleccionado = null;

// Procesar PDF
procesarBtn.addEventListener('click', async () => {
    if (!archivoSeleccionado) {
        alert('Selecciona un archivo PDF primero.');
        return;
    }
    procesarBtn.disabled = true;
    procesarBtn.textContent = 'Procesando...';
    descargarLink.style.display = 'none';
    previewContainer.innerHTML = '';
    try {
        const arrayBuffer = await archivoSeleccionado.arrayBuffer();
        pdfBytesProcesado = await procesarPDF(arrayBuffer);
        await mostrarPrevisualizacion(pdfBytesProcesado);

        // Crear enlace de descarga
        const blob = new Blob([pdfBytesProcesado], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        descargarLink.href = url;
        descargarLink.download = 'revista_procesada.pdf';
        descargarLink.style.display = 'inline-block';
        descargarLink.textContent = 'Descargar PDF';

        document.getElementById('previewSection').style.display = 'block';

        procesarBtn.style.display = 'none';

    } catch (e) {
        alert('Error al procesar el PDF: ' + e.message);
        console.error(e);
    }
    procesarBtn.disabled = false;
    procesarBtn.textContent = 'Procesar PDF';

});

async function procesarPDF(buffer) {
    const pdfOriginal = await PDFDocument.load(buffer);
    const totalPaginas = pdfOriginal.getPageCount();

    const pdfNuevo = await PDFDocument.create();

    const pares = generarPares(totalPaginas);

    const anchoTabloide = 1224; // 17 * 72
    const altoTabloide = 792; // 11 * 72

    const anchoPagina = anchoTabloide / 2;
    const altoPagina = altoTabloide;

    for (const [pagIzq, pagDer] of pares) {
        const paginaNueva = pdfNuevo.addPage([anchoTabloide, altoTabloide]);

        const paginaIzquierdaIdx = pagIzq - 1;
        const paginaDerechaIdx = pagDer - 1;

        if (paginaIzquierdaIdx >= 0 && paginaIzquierdaIdx < totalPaginas) {
            const [paginaIzqEmbed] = await pdfNuevo.embedPages([pdfOriginal.getPage(paginaIzquierdaIdx)]);
            paginaNueva.drawPage(paginaIzqEmbed, {
                x: 0,
                y: 0,
                width: anchoPagina,
                height: altoPagina,
            });
        }
        if (paginaDerechaIdx >= 0 && paginaDerechaIdx < totalPaginas && paginaDerechaIdx !== paginaIzquierdaIdx) {
            const [paginaDerEmbed] = await pdfNuevo.embedPages([pdfOriginal.getPage(paginaDerechaIdx)]);
            paginaNueva.drawPage(paginaDerEmbed, {
                x: anchoPagina,
                y: 0,
                width: anchoPagina,
                height: altoPagina,
            });
        }
    }

    // Rotar páginas según impar/par
    const paginas = pdfNuevo.getPages();
    for (let idx = 0; idx < paginas.length; idx++) {
        const pagina = paginas[idx];
        if ((idx + 1) % 2 === 1) {
            pagina.setRotation(degrees(270));
        } else {
            pagina.setRotation(degrees(90));
        }
    }

    const pdfBytes = await pdfNuevo.save();
    return pdfBytes;
}

// Función para mostrar previsualización en canvas usando pdf-lib + canvas
async function mostrarPrevisualizacion(pdfBytes) {
    previewContainer.innerHTML = '';

    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.2 }); // Ajusta el tamaño a gusto

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        previewContainer.appendChild(canvas);
    }
}



