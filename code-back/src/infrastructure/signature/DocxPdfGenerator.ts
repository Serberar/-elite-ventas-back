// Carbone busca soffice.bin en el PATH del proceso. En producción el servicio
// puede arrancar sin /usr/lib/libreoffice/program en PATH, así que lo añadimos
// antes de requerir carbone para que detectLibreOffice() lo encuentre.
const _libOfficeProgramPath = process.env.LIBREOFFICE_PROGRAM_PATH ?? '/usr/lib/libreoffice/program';
if (!process.env.PATH?.split(':').includes(_libOfficeProgramPath)) {
  process.env.PATH = `${_libOfficeProgramPath}:${process.env.PATH ?? ''}`;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const carbone = require('carbone') as {
  render: (
    templatePath: string,
    data: unknown,
    options: Record<string, unknown>,
    callback: (err: Error | null, result: Buffer) => void
  ) => void;
};

import { ContractData } from './PdfGenerator';

/**
 * Genera un PDF a partir de una plantilla .docx usando carbone + LibreOffice.
 *
 * El fichero .docx debe contener variables con la sintaxis de carbone: {d.nombre}, {d.dni}, etc.
 */
export async function generatePdfFromDocx(
  docxPath: string,
  data: ContractData
): Promise<Buffer> {
  const fecha = data.createdAt.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // En Carbone, {d.variable} accede a la raíz del objeto pasado.
  // El prefijo "d." en la plantilla es simplemente el alias de la raíz,
  // por lo que los datos deben estar en el nivel raíz (NO dentro de { d: {...} }).
  const carboneData = {
    nombre: data.client.firstName,
    apellidos: data.client.lastName,
    nombre_completo: `${data.client.firstName} ${data.client.lastName}`.trim(),
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
    items: data.items.map((item) => ({
      nombre: item.nameSnapshot,
      cantidad: item.quantity,
      precio: item.unitPrice.toFixed(2),
      total: item.finalPrice.toFixed(2),
      tipo: item.tipoSnapshot ?? '',
      periodo: item.periodoSnapshot ?? '',
      precio_base: item.precioBaseSnapshot != null ? item.precioBaseSnapshot.toFixed(2) : '',
      precio_consumo: item.precioConsumoSnapshot != null ? item.precioConsumoSnapshot.toFixed(2) : '',
      unidad: item.unidadConsumoSnapshot ?? '',
    })),
    total: data.totalAmount.toFixed(2),
  };

  return new Promise((resolve, reject) => {
    carbone.render(docxPath, carboneData, { convertTo: 'pdf' }, (err, result) => {
      if (err) {
        const error = err instanceof Error
          ? err
          : new Error(typeof err === 'string' ? err : JSON.stringify(err));
        return reject(error);
      }
      resolve(result);
    });
  });
}
