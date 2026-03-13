export type Align = 'left' | 'center' | 'right';

export interface ContractPageExtra {
  id: string;
  titulo: string;
  contenido: string;
  align?: Align;
  /** 'contenido' (por defecto) o 'firma' para insertar el bloque de firma */
  tipo?: 'contenido' | 'firma';
}

/**
 * Sección del contrato (completamente modular y reordenable).
 *
 * tipos:
 *   identidad  — nombre empresa + título del contrato + referencia + fecha
 *   datos_cliente — tabla de datos del cliente (o texto libre con variables)
 *   productos  — tabla de productos contratados
 *   firma      — bloque de firma del cliente
 *   pie        — pie de página / nota final
 *   texto      — texto libre con variables y formato markdown simple
 */
export interface SeccionContrato {
  id: string;
  tipo: 'logo' | 'identidad' | 'datos_cliente' | 'productos' | 'firma' | 'pie' | 'texto' | 'salto_pagina';
  /** Si true, la sección no aparece en el contrato pero se conserva su configuración */
  oculta?: boolean;

  // ── identidad ────────────────────────────────────────────────────────────
  nombreEmpresa?: string;
  nombreEmpresaAlign?: Align;
  /** Título del contrato (ej. "CONTRATO DE VENTA") */
  tituloContrato?: string;
  tituloContratoAlign?: Align;
  mostrarReferencia?: boolean;
  referenciaAlign?: Align;
  mostrarFecha?: boolean;
  fechaAlign?: Align;

  // ── texto / datos_cliente ────────────────────────────────────────────────
  /** Encabezado de la sección */
  titulo?: string;
  /** Contenido de texto (admite **negrita**, # Título y variables <<var>>) */
  contenido?: string;
  align?: Align;

  // ── datos_cliente — campos visibles en la tabla automática ──────────────
  mostrarNombre?: boolean;
  mostrarDni?: boolean;
  mostrarEmail?: boolean;
  mostrarTelefono?: boolean;
  mostrarNumeroCuenta?: boolean;
  mostrarDireccion?: boolean;
  mostrarCupsLuz?: boolean;
  mostrarCupsGas?: boolean;

  // ── firma ────────────────────────────────────────────────────────────────
  firmaSeccionTitulo?: string;
  firmaSeccionTituloAlign?: Align;
  firmaNota?: string;
  firmaNotaAlign?: Align;
  mostrarEmailFirma?: boolean;
  firmaEtiqueta?: string;

  // ── pie ──────────────────────────────────────────────────────────────────
  textoPie?: string;
  textoPieAlign?: Align;
  mostrarComercial?: boolean;

  // ── productos ────────────────────────────────────────────────────────────
  tituloSeccionProductos?: string;
  tituloSeccionProductosAlign?: Align;
  tablaUnicoTitulo?: string;
  tablaUnicoColConcepto?: string;
  tablaUnicoColCantidad?: string;
  tablaUnicoColPrecioUnit?: string;
  tablaUnicoColTotal?: string;
  tablaPeriodoTitulo?: string;
  tablaPeriodoColConcepto?: string;
  tablaPeriodoColPeriodicidad?: string;
  tablaPeriodoColPrecio?: string;
  tablaConsumoTitulo?: string;
  tablaConsumoColConcepto?: string;
  tablaConsumoColPrecioBase?: string;
  tablaConsumoColPrecioConsumo?: string;
  tablaConsumoColUnidad?: string;

  /** Mostrar columna "Total" en la tabla de precio fijo (precio × cant.) */
  mostrarColumnaTotalUnico?: boolean;
  /** Mostrar fila TOTAL general al final de la sección de productos */
  mostrarTotalGeneral?: boolean;

  // ── separador ────────────────────────────────────────────────────────────
  /** Si true, muestra una línea separadora horizontal bajo el módulo */
  mostrarSeparadorInferior?: boolean;
}

// ── New architecture types ────────────────────────────────────────────────────

export type TipoModulo = Exclude<SeccionContrato['tipo'], 'salto_pagina'>;

export interface ModuloDisponible extends Omit<SeccionContrato, 'tipo'> {
  tipo: TipoModulo;
  nombre: string;
  esDeServicio: boolean;
}

export interface PaginaContrato {
  id: string;
  titulo: string;
  modulosIds: string[];
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ContractConfig {
  /** Logo — configuración global (no es una sección) */
  logoPath: string | null;
  logoAlign: Align;
  logoEnPaginasExtra: boolean;

  /** Librería de módulos disponibles (nuevo formato) */
  modulos?: ModuloDisponible[];

  /** Páginas del contrato, cada una referencia módulos por ID (nuevo formato) */
  paginas?: PaginaContrato[];

  /** Todas las secciones del cuerpo del contrato — formato plano para PDF */
  seccionesContrato: SeccionContrato[];

  /** Páginas adicionales al final del PDF */
  paginasExtra: ContractPageExtra[];
}

/**
 * Plantilla de contrato — extiende ContractConfig con identidad propia.
 * Varias plantillas pueden coexistir; el comercial elige cuál enviar.
 */
export interface ContractTemplate extends ContractConfig {
  id: string;
  nombre: string;
  /** Si true, es la plantilla que se usa por defecto cuando no se especifica */
  esDefecto: boolean;
  /**
   * Ruta interna al fichero .docx subido por el administrador.
   * Si está presente, se usa carbone+LibreOffice en lugar del generador HTML/pdfkit.
   */
  docxPath?: string | null;
}

// ── Secciones por defecto ────────────────────────────────────────────────────

const PIE_DEFAULT =
  'Documento generado electrónicamente. La firma de este contrato tiene plena validez legal.';

export const DEFAULT_SECCIONES: SeccionContrato[] = [
  {
    id: 'default_identidad',
    tipo: 'identidad',
    nombreEmpresa: '',
    nombreEmpresaAlign: 'center',
    tituloContrato: 'CONTRATO DE VENTA',
    tituloContratoAlign: 'center',
    mostrarReferencia: true,
    referenciaAlign: 'center',
    mostrarFecha: true,
    fechaAlign: 'center',
  },
  {
    id: 'default_datos_cliente',
    tipo: 'datos_cliente',
  },
  {
    id: 'default_productos',
    tipo: 'productos',
    tituloSeccionProductos: 'PRODUCTOS CONTRATADOS',
    tituloSeccionProductosAlign: 'left',
    tablaUnicoTitulo: '',
    tablaUnicoColConcepto: 'Concepto',
    tablaUnicoColCantidad: 'Cant.',
    tablaUnicoColPrecioUnit: 'Precio unit.',
    tablaUnicoColTotal: 'Total',
    tablaPeriodoTitulo: 'Servicios periódicos',
    tablaPeriodoColConcepto: 'Concepto',
    tablaPeriodoColPeriodicidad: 'Periodicidad',
    tablaPeriodoColPrecio: 'Precio',
    tablaConsumoTitulo: 'Tarifas por consumo',
    tablaConsumoColConcepto: 'Concepto',
    tablaConsumoColPrecioBase: 'Precio base',
    tablaConsumoColPrecioConsumo: '€/unidad',
    tablaConsumoColUnidad: 'Unidad',
  },
  {
    id: 'default_firma',
    tipo: 'firma',
    firmaSeccionTitulo: 'FIRMA DEL CLIENTE',
    firmaSeccionTituloAlign: 'left',
    firmaNota: 'El firmante acepta las condiciones de este contrato de venta.',
    firmaNotaAlign: 'left',
    mostrarEmailFirma: true,
    firmaEtiqueta: 'Firma del cliente',
  },
  {
    id: 'default_pie',
    tipo: 'pie',
    textoPie: PIE_DEFAULT,
    textoPieAlign: 'center',
  },
];

export const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  logoPath: null,
  logoAlign: 'left',
  logoEnPaginasExtra: false,
  seccionesContrato: DEFAULT_SECCIONES,
  paginasExtra: [],
};
