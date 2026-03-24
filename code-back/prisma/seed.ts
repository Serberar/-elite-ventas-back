import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CALLCENTER_ID = '00000000-0000-0000-0000-000000000001';

const TODAS_LAS_PAGINAS = [
  'buscador',
  'aplicaciones',
  'ventas',
  'productos',
  'clientes',
  'contratos',
  'grabaciones',
  'usuarios',
  'configuracion',
];

// Estados de sistema por defecto — se clonan al crear cada empresa nueva
const ESTADOS_SISTEMA = [
  { name: 'Pendiente',   order: 1, color: '#F59E0B', isFinal: false, isCancelled: false, isSystem: true },
  { name: 'En proceso',  order: 2, color: '#3B82F6', isFinal: false, isCancelled: false, isSystem: true },
  { name: 'Completado',  order: 3, color: '#10B981', isFinal: true,  isCancelled: false, isSystem: true },
  { name: 'Cancelado',   order: 4, color: '#EF4444', isFinal: true,  isCancelled: true,  isSystem: true },
];

async function main() {
  console.log('🌱 Seed iniciado...');

  // Crear empresa callcenter si no existe
  const empresa = await prisma.empresa.upsert({
    where: { id: CALLCENTER_ID },
    update: {},
    create: {
      id: CALLCENTER_ID,
      nombre: 'Call Center',
      slug: 'callcenter',
      activa: true,
      paginasHabilitadas: TODAS_LAS_PAGINAS,
    },
  });

  console.log(`✓ Empresa creada: ${empresa.nombre} (${empresa.id})`);

  // Crear estados de sistema para callcenter si no existen
  const estadosExistentes = await prisma.saleStatus.count({
    where: { empresaId: CALLCENTER_ID },
  });

  if (estadosExistentes === 0) {
    for (const estado of ESTADOS_SISTEMA) {
      await prisma.saleStatus.create({
        data: { ...estado, empresaId: CALLCENTER_ID },
      });
    }
    console.log(`✓ Estados de venta creados: ${ESTADOS_SISTEMA.length}`);
  } else {
    console.log(`ℹ  Estados de venta ya existen (${estadosExistentes}), omitiendo`);
  }

  console.log('✅ Seed completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
