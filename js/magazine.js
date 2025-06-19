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
    procesarBtn.disabled = false;
    descargarLink.style.display = 'none';
    previewContainer.innerHTML = '';
    pdfBytesProcesado = null;
    dragDropArea.textContent = `Archivo cargado: ${file.name}`;
    dragDropArea.appendChild(inputPDF);
    inputPDF.value = '';
    archivoSeleccionado = file;
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
        descargarLink.download = 'pdf_acomodo_tabloide_rotado.pdf';
        descargarLink.style.display = 'inline-block';
        descargarLink.textContent = 'Descargar PDF con Acomodo y Rotación';
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
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const paginas = pdfDoc.getPages();

    for (let i = 0; i < paginas.length; i++) {
        // Para previsualizar vamos a usar un pequeño canvas
        // pdf-lib no renderiza, así que usaremos pdf.js para renderizar
        // Pero para mantenerlo simple sin librerías externas, 
        // haremos algo sencillo: mostrar miniatura de la página (thumbnail)
        // con la ayuda de un iframe embebido con src en blob URL.
        // Pero iframe es pesado, así que mejor usaremos pdf.js (CDN) para render en canvas

        // Para evitar usar pdf.js que es pesado, aquí hacemos una técnica sencilla:
        // creamos un <embed> PDF con solo una página. Pero embed no permite páginas específicas.
        // Mejor mostrar texto simple con número de página.

        // Por simplicidad, mostraremos solo un canvas con texto indicando página.
        // Si quieres render real con pdf.js dime y lo integro.

        const canvas = document.createElement('canvas');
        canvas.width = 150;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#eee';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Página ${i + 1}`, canvas.width / 2, canvas.height / 2);
        ctx.font = '14px Arial';
        ctx.fillText(`(Vista previa simple)`, canvas.width / 2, canvas.height / 2 + 30);

        previewContainer.appendChild(canvas);
    }
}