/**
 * Estados de sistema que toda empresa debe tener.
 * Se crean automáticamente al crear una empresa y se verifican en Bootstrap.
 */
export const SYSTEM_STATUSES = [
  { name: 'Pendiente firma', order: 1, color: '#f59e0b', isFinal: false, isCancelled: false, isSystem: true },
  { name: 'Firmada',         order: 2, color: '#10b981', isFinal: true,  isCancelled: false, isSystem: true },
  { name: 'Cancelada',       order: 3, color: '#ef4444', isFinal: true,  isCancelled: true,  isSystem: true },
] as const;
