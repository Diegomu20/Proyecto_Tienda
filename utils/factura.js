// utils/factura.js — Generador de factura electrónica en PDF
const PDFDocument = require('pdfkit');

/**
 * Genera un PDF de factura y lo escribe en el response o en un stream.
 * @param {Object} datos - { orden, cliente, items, medioPago }
 * @param {Object} stream - res (response de Express) o un fs.createWriteStream
 */
function generarFacturaPDF(datos, stream) {
  const { orden, cliente, items, medioPago } = datos;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(stream);

  // ── Colores ────────────────────────────────────────────────────────────────
  const VERDE    = '#2d6a4f';
  const VERDE_C  = '#52b788';
  const GRIS     = '#6c757d';
  const NEGRO    = '#1a1a1a';
  const BLANCO   = '#ffffff';
  const GRIS_F   = '#f8f9fa';

  const W = 595 - 100; // ancho útil (A4 595pt - márgenes)

  // ── CABECERA ───────────────────────────────────────────────────────────────
  // Fondo verde cabecera
  doc.rect(0, 0, 595, 110).fill(VERDE);

  // Nombre empresa
  doc.fillColor(BLANCO)
     .fontSize(26).font('Helvetica-Bold')
     .text('AGROFERRE STORE', 50, 28);

  doc.fontSize(11).font('Helvetica')
     .text('Ferretería & Agropecuaria', 50, 58)
     .text('NIT: 900.123.456-7  •  Tel: (7) 123 4567', 50, 74)
     .text('San Gil, Santander, Colombia', 50, 90);

  // Etiqueta FACTURA
  doc.rect(420, 20, 130, 70).fill(VERDE_C).stroke();
  doc.fillColor(BLANCO)
     .fontSize(18).font('Helvetica-Bold')
     .text('FACTURA', 428, 32)
     .fontSize(11).font('Helvetica')
     .text(`N° ${String(orden.id).padStart(6, '0')}`, 435, 56)
     .text('ELECTRÓNICA', 430, 74);

  // ── DATOS FACTURA + CLIENTE ────────────────────────────────────────────────
  const fecha = new Date(orden.createdAt || Date.now());
  const fechaStr = fecha.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const horaStr = fecha.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit'
  });

  // Caja izquierda — datos factura
  doc.rect(50, 125, 235, 100).fill(GRIS_F).stroke('#dee2e6');
  doc.fillColor(VERDE).fontSize(10).font('Helvetica-Bold')
     .text('DATOS DE LA FACTURA', 60, 135);
  doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
     .text(`Fecha:`, 60, 152).font('Helvetica-Bold').text(fechaStr, 110, 152)
     .font('Helvetica').text(`Hora:`, 60, 167).font('Helvetica-Bold').text(horaStr, 110, 167)
     .font('Helvetica').text(`Estado:`, 60, 182).font('Helvetica-Bold')
     .fillColor(VERDE_C).text(orden.estado?.toUpperCase() || 'PENDIENTE', 110, 182)
     .fillColor(NEGRO).font('Helvetica').text(`Medio de pago:`, 60, 197)
     .font('Helvetica-Bold').text(medioPago || 'Efectivo', 145, 197);

  // Caja derecha — datos cliente
  doc.rect(300, 125, 245, 100).fill(GRIS_F).stroke('#dee2e6');
  doc.fillColor(VERDE).fontSize(10).font('Helvetica-Bold')
     .text('DATOS DEL CLIENTE', 310, 135);
  doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
     .text(`Cliente:`, 310, 152).font('Helvetica-Bold').text(cliente.nombre || 'N/A', 360, 152)
     .font('Helvetica').text(`Email:`, 310, 167).font('Helvetica-Bold').text(cliente.email || 'N/A', 360, 167)
     .font('Helvetica').text(`Cliente desde:`, 310, 182)
     .font('Helvetica-Bold').text(
        new Date(cliente.createdAt || Date.now()).toLocaleDateString('es-CO'), 390, 182
     );

  // ── TABLA DE PRODUCTOS ─────────────────────────────────────────────────────
  const tablaY = 245;

  // Encabezado tabla
  doc.rect(50, tablaY, W, 22).fill(VERDE);
  doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold')
     .text('#',       58,  tablaY + 7)
     .text('PRODUCTO',  80,  tablaY + 7)
     .text('CANT.',    320,  tablaY + 7)
     .text('P. UNIT.',  370,  tablaY + 7)
     .text('SUBTOTAL',  440,  tablaY + 7);

  // Filas de productos
  let y = tablaY + 22;
  items.forEach((item, idx) => {
    const fondo = idx % 2 === 0 ? BLANCO : GRIS_F;
    doc.rect(50, y, W, 20).fill(fondo).stroke('#dee2e6');

    const nombre = item.product?.nombre || item.nombre || 'Producto';
    const nombreCorto = nombre.length > 35 ? nombre.substring(0, 35) + '...' : nombre;
    const precioUnit = Number(item.precioUnitario || 0);
    const cantidad   = Number(item.cantidad || 1);
    const subtotal   = precioUnit * cantidad;

    doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
       .text(idx + 1,             58,  y + 6)
       .text(nombreCorto,          80,  y + 6)
       .text(cantidad,            330,  y + 6)
       .text(formatCOP(precioUnit), 360,  y + 6)
       .text(formatCOP(subtotal),  435,  y + 6);

    y += 20;
  });

  // ── TOTALES ────────────────────────────────────────────────────────────────
  y += 10;
  const subtotalBruto = Number(orden.total) / 1.19;
  const iva           = Number(orden.total) - subtotalBruto;

  // Caja totales
  doc.rect(350, y, 195, 80).fill(GRIS_F).stroke('#dee2e6');

  doc.fillColor(GRIS).fontSize(9).font('Helvetica')
     .text('Subtotal:',  360, y + 10)
     .text(formatCOP(subtotalBruto), 480, y + 10, { align: 'right', width: 55 });

  doc.text('IVA (19%):',  360, y + 28)
     .text(formatCOP(iva), 480, y + 28, { align: 'right', width: 55 });

  doc.rect(350, y + 46, 195, 24).fill(VERDE);
  doc.fillColor(BLANCO).fontSize(11).font('Helvetica-Bold')
     .text('TOTAL:',  360, y + 52)
     .text(formatCOP(Number(orden.total)), 430, y + 52, { align: 'right', width: 105 });

  // ── CÓDIGO DE VERIFICACIÓN ─────────────────────────────────────────────────
  y += 100;
  doc.rect(50, y, W, 30).fill('#e8f5e9').stroke(VERDE_C);
  doc.fillColor(VERDE).fontSize(9).font('Helvetica-Bold')
     .text('Código de verificación electrónica:', 60, y + 10);
  doc.fillColor(GRIS).font('Helvetica')
     .text(`AGRO-${String(orden.id).padStart(6,'0')}-${Date.now().toString(36).toUpperCase()}`, 240, y + 10);

  // ── PIE DE PÁGINA ──────────────────────────────────────────────────────────
  y += 50;
  doc.moveTo(50, y).lineTo(545, y).stroke(VERDE_C);

  doc.fillColor(GRIS).fontSize(8).font('Helvetica')
     .text('Este documento es una factura electrónica con validez fiscal.', 50, y + 8, { align: 'center', width: W })
     .text('Agroferre Store — San Gil, Santander — agroferre@tienda.com — www.agroferre.com', 50, y + 20, { align: 'center', width: W })
     .text(`Generada el ${fechaStr} a las ${horaStr}`, 50, y + 32, { align: 'center', width: W });

  doc.end();
}

function formatCOP(valor) {
  return '$ ' + Number(valor).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

module.exports = { generarFacturaPDF };
