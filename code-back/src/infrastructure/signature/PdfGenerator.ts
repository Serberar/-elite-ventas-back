import PDFDocument from 'pdfkit';
import fs from 'fs';
import { ContractConfig, SeccionContrato, DEFAULT_CONTRACT_CONFIG, DEFAULT_SECCIONES } from '@domain/types/ContractConfig';

export interface ContractData {
  saleId: string;
  createdAt: Date;
  client: {
    firstName: string;
    lastName: string;
    dni: string;
    email?: string;
    phones?: string[];
    bankAccounts?: string[];
    address?: {
      address?: string;
      cupsLuz?: string;
      cupsGas?: string;
    };
  };
  items: Array<{
    nameSnapshot: string;
    quantity: number;
    unitPrice: number;
    finalPrice: number;
    tipoSnapshot?: string | null;
    periodoSnapshot?: string | null;
    precioBaseSnapshot?: number | null;
    precioConsumoSnapshot?: number | null;
    unidadConsumoSnapshot?: string | null;
  }>;
  totalAmount: number;
  comercial?: string;
}

// ── Helpers de texto ─────────────────────────────────────────────────────────

/** Sustituye <<variable>> por el valor correspondiente de los datos del contrato */
function interpolate(text: string, data: ContractData, fecha: string): string {
  if (!text) return text;
  const values: Record<string, string> = {
    nombre: data.client.firstName,
    apellidos: data.client.lastName,
    nombre_completo: `${data.client.firstName} ${data.client.lastName}`,
    dni: data.client.dni,
    email: data.client.email ?? '',
    telefono: data.client.phones?.[0] ?? '',
    numero_cuenta: data.client.bankAccounts?.[0] ?? '',
    direccion: data.client.address?.address ?? '',
    cups_luz: data.client.address?.cupsLuz ?? '',
    cups_gas: data.client.address?.cupsGas ?? '',
    referencia: data.saleId,
    fecha,
    comercial: data.comercial ?? '',
  };
  return text.replace(/<<([^>]+)>>/g, (_, key: string) => values[key] ?? `<<${key}>>`);
}

/**
 * Renderiza texto con soporte para:
 *   # Título grande   → fontSize 15 bold
 *   ## Título mediano → fontSize 12 bold
 *   **negrita**       → inline bold
 *   Saltos de línea   → párrafos
 */
function renderMarkdownText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts: Record<string, unknown> = {}
) {
  if (!text) return;
  const lines = text.split('\n');
  let currentY = y;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      doc.fontSize(12).font('Helvetica-Bold').text(line.slice(3), x, currentY, { ...opts, continued: false });
      currentY = doc.y;
      continue;
    }
    if (line.startsWith('# ')) {
      doc.fontSize(15).font('Helvetica-Bold').text(line.slice(2), x, currentY, { ...opts, continued: false });
      currentY = doc.y;
      continue;
    }
    // Línea con posible negrita inline
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    let lineX = x;
    const lineY = currentY;
    let first = true;
    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        if (first) {
          doc.fontSize(10).font('Helvetica-Bold').text(boldText, lineX, lineY, { ...opts, continued: true });
        } else {
          doc.font('Helvetica-Bold').text(boldText, { continued: true });
        }
      } else if (part) {
        if (first) {
          doc.fontSize(10).font('Helvetica').text(part, lineX, lineY, { ...opts, continued: true });
        } else {
          doc.font('Helvetica').text(part, { continued: true });
        }
      }
      first = false;
      lineX = 0;
    }
    doc.font('Helvetica').text('', { continued: false });
    currentY = doc.y;
  }
}

// ── Renderizadores por tipo de sección ───────────────────────────────────────

function renderLogoBlock(doc: PDFKit.PDFDocument, cfg: ContractConfig) {
  if (!cfg.logoPath) return;
  const logoWidth = 120;
  const maxLogoHeight = 80;
  let logoX = 50;
  if (cfg.logoAlign === 'center') logoX = (doc.page.width - logoWidth) / 2;
  else if (cfg.logoAlign === 'right') logoX = doc.page.width - 50 - logoWidth;
  doc.moveDown(0.5);
  const startY = doc.y;
  doc.image(cfg.logoPath, logoX, startY, { fit: [logoWidth, maxLogoHeight] });
  // Force doc.y past the image — PDFKit may not advance y after image() with explicit coords
  doc.y = Math.max(doc.y, startY + maxLogoHeight);
  doc.moveDown(1);
}

function renderIdentidadBlock(
  doc: PDFKit.PDFDocument,
  seccion: SeccionContrato,
  data: ContractData,
  fecha: string
) {
  if (seccion.nombreEmpresa) {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(seccion.nombreEmpresa, { align: seccion.nombreEmpresaAlign ?? 'center' });
    doc.moveDown(0.3);
  }

  if (seccion.tituloContrato) {
    doc.fontSize(20).font('Helvetica-Bold').text(seccion.tituloContrato, { align: seccion.tituloContratoAlign ?? 'center' });
    doc.moveDown(0.3);
  }

  const mostrarRef = seccion.mostrarReferencia ?? true;
  const mostrarFecha = seccion.mostrarFecha ?? true;
  if (mostrarRef || mostrarFecha) {
    doc.fontSize(10).font('Helvetica');
    if (mostrarRef) doc.text(`Referencia: ${data.saleId}`, { align: seccion.referenciaAlign ?? 'center' });
    if (mostrarFecha) doc.text(`Fecha: ${fecha}`, { align: seccion.fechaAlign ?? 'center' });
  }
}

function renderDatosClienteBlock(doc: PDFKit.PDFDocument, seccion: SeccionContrato, data: ContractData, fecha: string) {
  const sectionTitle = seccion.titulo || 'DATOS DEL CLIENTE';
  doc.fontSize(13).font('Helvetica-Bold').text(sectionTitle);
  doc.moveDown(0.5);

  if (seccion.contenido) {
    // Texto personalizado con variables
    const content = interpolate(seccion.contenido, data, fecha);
    doc.fontSize(10).font('Helvetica');
    renderMarkdownText(doc, content, 50, doc.y, { width: 495, align: seccion.align ?? 'left' });
  } else {
    // Tabla automática de datos del cliente — respeta los toggles mostrarXxx (true por defecto)
    doc.fontSize(10).font('Helvetica');
    const clientFullName = `${data.client.firstName} ${data.client.lastName}`;
    const show = (field: boolean | undefined) => field !== false;
    if (show(seccion.mostrarNombre)) doc.text(`Nombre: ${clientFullName}`);
    if (show(seccion.mostrarDni)) doc.text(`DNI/NIF: ${data.client.dni}`);
    if (show(seccion.mostrarEmail) && data.client.email) doc.text(`Email: ${data.client.email}`);
    if (show(seccion.mostrarTelefono) && data.client.phones?.length) doc.text(`Teléfono: ${data.client.phones[0]}`);
    if (show(seccion.mostrarNumeroCuenta) && data.client.bankAccounts?.length) doc.text(`Número de cuenta: ${data.client.bankAccounts[0]}`);
    if (show(seccion.mostrarDireccion) && data.client.address?.address) doc.text(`Dirección: ${data.client.address.address}`);
    if (show(seccion.mostrarCupsLuz) && data.client.address?.cupsLuz) doc.text(`CUPS Luz: ${data.client.address.cupsLuz}`);
    if (show(seccion.mostrarCupsGas) && data.client.address?.cupsGas) doc.text(`CUPS Gas: ${data.client.address.cupsGas}`);
  }
  doc.moveDown(1);
}

function renderProductosBlock(doc: PDFKit.PDFDocument, seccion: SeccionContrato, data: ContractData) {
  const titulo = seccion.tituloSeccionProductos || 'PRODUCTOS CONTRATADOS';
  doc.fontSize(13).font('Helvetica-Bold').text(titulo, { align: seccion.tituloSeccionProductosAlign ?? 'left' });
  doc.moveDown(0.5);

  const itemsUnico = data.items.filter((i) => (i.tipoSnapshot ?? 'unico') === 'unico');
  const itemsPeriodo = data.items.filter((i) => i.tipoSnapshot === 'periodico');
  const itemsConsumo = data.items.filter((i) => i.tipoSnapshot === 'consumo');

  if (itemsUnico.length > 0) {
    if (seccion.tablaUnicoTitulo) {
      doc.fontSize(10).font('Helvetica-Bold').text(seccion.tablaUnicoTitulo);
      doc.moveDown(0.3);
    }
    const colX = { name: 50, qty: 310, unit: 370, total: 460 };
    doc.fontSize(9).font('Helvetica-Bold')
      .text(seccion.tablaUnicoColConcepto || 'Concepto', colX.name, doc.y, { width: 250 })
      .text(seccion.tablaUnicoColCantidad || 'Cant.', colX.qty, doc.y - 11, { width: 50 })
      .text(seccion.tablaUnicoColPrecioUnit || 'Precio unit.', colX.unit, doc.y - 11, { width: 80 })
      .text(seccion.tablaUnicoColTotal || 'Total', colX.total, doc.y - 11, { width: 80 });
    doc.moveDown(0.3).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    for (const item of itemsUnico) {
      const rowY = doc.y;
      doc.text(item.nameSnapshot, colX.name, rowY, { width: 250 });
      doc.text(String(item.quantity), colX.qty, rowY, { width: 50 });
      doc.text(`${Number(item.unitPrice).toFixed(2)} €`, colX.unit, rowY, { width: 80 });
      doc.text(`${Number(item.finalPrice).toFixed(2)} €`, colX.total, rowY, { width: 80 });
      doc.moveDown(0.5);
    }
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);
  }

  if (itemsPeriodo.length > 0) {
    if (seccion.tablaPeriodoTitulo) {
      doc.fontSize(10).font('Helvetica-Bold').text(seccion.tablaPeriodoTitulo);
      doc.moveDown(0.3);
    }
    const colP = { name: 50, period: 310, price: 420 };
    doc.fontSize(9).font('Helvetica-Bold')
      .text(seccion.tablaPeriodoColConcepto || 'Concepto', colP.name, doc.y, { width: 250 })
      .text(seccion.tablaPeriodoColPeriodicidad || 'Periodicidad', colP.period, doc.y - 11, { width: 100 })
      .text(seccion.tablaPeriodoColPrecio || 'Precio', colP.price, doc.y - 11, { width: 120 });
    doc.moveDown(0.3).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    for (const item of itemsPeriodo) {
      const rowY = doc.y;
      doc.text(item.nameSnapshot, colP.name, rowY, { width: 250 });
      doc.text(item.periodoSnapshot ?? '—', colP.period, rowY, { width: 100 });
      doc.text(`${Number(item.unitPrice).toFixed(2)} €`, colP.price, rowY, { width: 120 });
      doc.moveDown(0.5);
    }
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);
  }

  if (itemsConsumo.length > 0) {
    if (seccion.tablaConsumoTitulo) {
      doc.fontSize(10).font('Helvetica-Bold').text(seccion.tablaConsumoTitulo);
      doc.moveDown(0.3);
    }
    const colC = { name: 50, base: 260, rate: 360, unit: 460 };
    doc.fontSize(9).font('Helvetica-Bold')
      .text(seccion.tablaConsumoColConcepto || 'Concepto', colC.name, doc.y, { width: 200 })
      .text(seccion.tablaConsumoColPrecioBase || 'Precio base', colC.base, doc.y - 11, { width: 90 })
      .text(seccion.tablaConsumoColPrecioConsumo || '€/unidad', colC.rate, doc.y - 11, { width: 90 })
      .text(seccion.tablaConsumoColUnidad || 'Unidad', colC.unit, doc.y - 11, { width: 80 });
    doc.moveDown(0.3).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    for (const item of itemsConsumo) {
      const rowY = doc.y;
      doc.text(item.nameSnapshot, colC.name, rowY, { width: 200 });
      doc.text(item.precioBaseSnapshot != null ? `${Number(item.precioBaseSnapshot).toFixed(2)} €` : '—', colC.base, rowY, { width: 90 });
      doc.text(item.precioConsumoSnapshot != null ? `${Number(item.precioConsumoSnapshot).toFixed(4)} €` : '—', colC.rate, rowY, { width: 90 });
      doc.text(item.unidadConsumoSnapshot ?? '—', colC.unit, rowY, { width: 80 });
      doc.moveDown(0.5);
    }
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);
  }

  doc.fontSize(11).font('Helvetica-Bold').text(`TOTAL: ${Number(data.totalAmount).toFixed(2)} €`, 340, doc.y, {
    width: 205,
    align: 'right',
  });
  doc.moveDown(1);
}

function renderFirmaBlock(
  doc: PDFKit.PDFDocument,
  seccion: SeccionContrato,
  clientFullName: string,
  signerEmail?: string
) {
  const firmaTitle = seccion.firmaSeccionTitulo || 'FIRMA DEL CLIENTE';
  doc.fontSize(13).font('Helvetica-Bold').text(firmaTitle, { align: seccion.firmaSeccionTituloAlign ?? 'left' });
  doc.moveDown(0.5);

  if (seccion.firmaNota) {
    doc.fontSize(10).font('Helvetica').text(seccion.firmaNota, { align: seccion.firmaNotaAlign ?? 'left' });
  }

  doc.moveDown(3);
  doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
  doc.moveDown(0.3);
  doc.fontSize(9).text(clientFullName, 50, doc.y, { width: 200 });
  const etiqueta = seccion.firmaEtiqueta || 'Firma del cliente';
  doc.fontSize(8).fillColor('#888888').text(etiqueta, 50, doc.y);
  doc.fillColor('#000000');
  doc.moveDown(2);
}

function renderPieBlock(doc: PDFKit.PDFDocument, seccion: SeccionContrato) {
  const texto = seccion.textoPie || DEFAULT_CONTRACT_CONFIG.seccionesContrato.find((s) => s.tipo === 'pie')?.textoPie || '';
  doc
    .fontSize(8)
    .fillColor('#666666')
    .text(texto, 50, doc.y, { align: seccion.textoPieAlign ?? 'center', width: 495 });
  doc.fillColor('#000000');
  doc.moveDown(1);
}

function renderTextoBlock(doc: PDFKit.PDFDocument, seccion: SeccionContrato, data: ContractData, fecha: string) {
  if (seccion.titulo) {
    doc.fontSize(13).font('Helvetica-Bold').text(seccion.titulo);
    doc.moveDown(0.5);
  }
  if (seccion.contenido) {
    const content = interpolate(seccion.contenido, data, fecha);
    doc.fontSize(10).font('Helvetica');
    renderMarkdownText(doc, content, 50, doc.y, { width: 495, align: seccion.align ?? 'left' });
  }
  doc.moveDown(1);
}

// ── PdfGenerator ─────────────────────────────────────────────────────────────

export class PdfGenerator {
  generate(data: ContractData, config?: ContractConfig): Promise<Buffer> {
    const cfg: ContractConfig = config ?? DEFAULT_CONTRACT_CONFIG;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const clientFullName = `${data.client.firstName} ${data.client.lastName}`;
      const fecha = data.createdAt.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      // ── Secciones del cuerpo ──────────────────────────────────────────────
      const secciones: SeccionContrato[] =
        cfg.seccionesContrato && cfg.seccionesContrato.length > 0
          ? cfg.seccionesContrato
          : DEFAULT_SECCIONES;

      const visibles = secciones.filter((s) => !s.oculta);

      for (const seccion of visibles) {
        if (seccion.tipo === 'salto_pagina') {
          doc.addPage();
          doc.fillColor('#000000');
          continue;
        }

        if (seccion.tipo === 'logo') {
          if (cfg.logoPath && fs.existsSync(cfg.logoPath)) {
            try { renderLogoBlock(doc, cfg); } catch { /* sin logo */ }
          }
          if (seccion.mostrarSeparadorInferior) {
            doc.moveDown(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);
          }
          continue;
        }

        if (seccion.tipo === 'identidad') {
          renderIdentidadBlock(doc, seccion, data, fecha);
        } else if (seccion.tipo === 'datos_cliente') {
          renderDatosClienteBlock(doc, seccion, data, fecha);
        } else if (seccion.tipo === 'productos') {
          renderProductosBlock(doc, seccion, data);
        } else if (seccion.tipo === 'firma') {
          renderFirmaBlock(doc, seccion, clientFullName);
        } else if (seccion.tipo === 'pie') {
          renderPieBlock(doc, seccion);
        } else if (seccion.tipo === 'texto') {
          renderTextoBlock(doc, seccion, data, fecha);
        }

        // Separador inferior — solo si el módulo lo tiene activado
        if (seccion.mostrarSeparadorInferior) {
          doc.moveDown(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
          doc.moveDown(0.5);
        }
      }

      // ── Páginas extra ──────────────────────────────────────────────────────
      for (const pagina of cfg.paginasExtra) {
        doc.addPage();
        doc.fillColor('#000000');

        if (pagina.tipo === 'firma') {
          const firmaSeccion = secciones.find((s) => s.tipo === 'firma') ?? {
            id: 'fallback_firma',
            tipo: 'firma' as const,
            firmaSeccionTitulo: 'FIRMA DEL CLIENTE',
            firmaSeccionTituloAlign: 'left' as const,
            firmaNota: '',
            firmaNotaAlign: 'left' as const,
            mostrarEmailFirma: true,
            firmaEtiqueta: 'Firma del cliente',
          };
          renderFirmaBlock(doc, firmaSeccion, clientFullName);
        } else {
          doc.fontSize(16).font('Helvetica-Bold').text(pagina.titulo, { align: 'center' });
          doc.moveDown(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
          doc.moveDown(1);
          doc.fontSize(10).font('Helvetica');
          renderMarkdownText(doc, interpolate(pagina.contenido, data, fecha), 50, doc.y, {
            width: 495,
            align: pagina.align ?? 'left',
          });
        }
      }

      doc.end();
    });
  }
}
