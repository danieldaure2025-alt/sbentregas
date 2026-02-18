import { PrismaClient, UserRole, UserStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create System Config
  console.log('Creating system config...');
  await prisma.systemConfig.upsert({
    where: { key: 'BASE_FEE' },
    update: { value: '5.0' },
    create: {
      key: 'BASE_FEE',
      value: '5.0',
      description: 'Taxa base cobrada em todas as entregas',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'PRICE_PER_KM' },
    update: { value: '2.5' },
    create: {
      key: 'PRICE_PER_KM',
      value: '2.5',
      description: 'Preço cobrado por quilômetro',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'PLATFORM_FEE_PERCENTAGE' },
    update: { value: '0.15' },
    create: {
      key: 'PLATFORM_FEE_PERCENTAGE',
      value: '0.15',
      description: 'Percentual de taxa da plataforma (15%)',
    },
  });

  // Create Admin User (default test account)
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('johndoe123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phone: '(11) 99999-9999',
    },
  });

  // Create sample clients
  console.log('Creating sample clients...');
  const clientPassword = await bcrypt.hash('password123', 10);

  const client1 = await prisma.user.upsert({
    where: { email: 'maria.silva@email.com' },
    update: {},
    create: {
      email: 'maria.silva@email.com',
      passwordHash: clientPassword,
      name: 'Maria Silva',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      phone: '(11) 98888-8888',
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: 'joao.santos@email.com' },
    update: {},
    create: {
      email: 'joao.santos@email.com',
      passwordHash: clientPassword,
      name: 'João Santos',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      phone: '(11) 97777-7777',
    },
  });

  // Create sample delivery persons
  console.log('Creating sample delivery persons...');
  const deliveryPassword = await bcrypt.hash('password123', 10);

  const delivery1 = await prisma.user.upsert({
    where: { email: 'carlos.entregador@email.com' },
    update: {},
    create: {
      email: 'carlos.entregador@email.com',
      passwordHash: deliveryPassword,
      name: 'Carlos Entregador',
      role: UserRole.DELIVERY_PERSON,
      status: UserStatus.ACTIVE,
      phone: '(11) 96666-6666',
      vehicleType: 'Moto',
      licenseNumber: '12345678900',
      rating: 4.8,
      totalDeliveries: 150,
    },
  });

  const delivery2 = await prisma.user.upsert({
    where: { email: 'ana.entregadora@email.com' },
    update: {},
    create: {
      email: 'ana.entregadora@email.com',
      passwordHash: deliveryPassword,
      name: 'Ana Entregadora',
      role: UserRole.DELIVERY_PERSON,
      status: UserStatus.ACTIVE,
      phone: '(11) 95555-5555',
      vehicleType: 'Carro',
      licenseNumber: '98765432100',
      rating: 4.9,
      totalDeliveries: 200,
    },
  });

  // Create a pending delivery person
  const delivery3 = await prisma.user.upsert({
    where: { email: 'pedro.pendente@email.com' },
    update: {},
    create: {
      email: 'pedro.pendente@email.com',
      passwordHash: deliveryPassword,
      name: 'Pedro Aguardando',
      role: UserRole.DELIVERY_PERSON,
      status: UserStatus.PENDING_APPROVAL,
      phone: '(11) 94444-4444',
      vehicleType: 'Moto',
      licenseNumber: '11122233344',
      rating: 0,
      totalDeliveries: 0,
    },
  });

  // Create sample orders
  console.log('Creating sample orders...');

  // Completed order
  const order1 = await prisma.order.create({
    data: {
      clientId: client1.id,
      deliveryPersonId: delivery1.id,
      originAddress: 'Rua das Flores, 123 - Centro, São Paulo - SP',
      destinationAddress: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      notes: 'Entregar na recepção',
      distance: 5.5,
      price: 22.88,
      status: OrderStatus.DELIVERED,
      acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      pickedUpAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      inTransitAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order1.id,
      totalAmount: 22.88,
      platformFee: 2.98,
      deliveryFee: 19.9,
      paymentStatus: PaymentStatus.COMPLETED,
      paymentMethod: 'CREDIT_CARD',
    },
  });

  await prisma.rating.create({
    data: {
      orderId: order1.id,
      clientId: client1.id,
      deliveryPersonId: delivery1.id,
      rating: 5,
      comment: 'Ótimo entregador! Muito rápido e educado.',
    },
  });

  // Active order (in transit)
  const order2 = await prisma.order.create({
    data: {
      clientId: client2.id,
      deliveryPersonId: delivery2.id,
      originAddress: 'Rua Augusta, 500 - Consolação, São Paulo - SP',
      destinationAddress: 'Rua Oscar Freire, 200 - Jardins, São Paulo - SP',
      notes: 'Ligar quando chegar',
      distance: 3.2,
      price: 15.30,
      status: OrderStatus.IN_TRANSIT,
      acceptedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      pickedUpAt: new Date(Date.now() - 90 * 60 * 1000),
      inTransitAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order2.id,
      totalAmount: 15.30,
      platformFee: 1.99,
      deliveryFee: 13.31,
      paymentStatus: PaymentStatus.COMPLETED,
      paymentMethod: 'PIX',
    },
  });

  // Pending order (no delivery person yet)
  const order3 = await prisma.order.create({
    data: {
      clientId: client1.id,
      originAddress: 'Av. Faria Lima, 1500 - Jardim Paulistano, São Paulo - SP',
      destinationAddress: 'Rua Haddock Lobo, 595 - Jardins, São Paulo - SP',
      distance: 2.8,
      price: 13.22,
      status: OrderStatus.PENDING,
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order3.id,
      totalAmount: 13.22,
      platformFee: 1.72,
      deliveryFee: 11.50,
      paymentStatus: PaymentStatus.COMPLETED,
      paymentMethod: 'CREDIT_CARD',
    },
  });

  // Another pending order
  const order4 = await prisma.order.create({
    data: {
      clientId: client2.id,
      originAddress: 'Av. Brigadeiro Faria Lima, 2927 - Jardim Paulistano, São Paulo - SP',
      destinationAddress: 'Rua Ataliba de Barros, 100 - Vila Olímpia, São Paulo - SP',
      notes: 'Documento urgente',
      distance: 4.5,
      price: 18.38,
      status: OrderStatus.PENDING,
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order4.id,
      totalAmount: 18.38,
      platformFee: 2.39,
      deliveryFee: 15.99,
      paymentStatus: PaymentStatus.COMPLETED,
      paymentMethod: 'DEBIT_CARD',
    },
  });

  // Create audit logs
  console.log('Creating audit logs...');
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_SEEDED',
      details: 'Database seeded with initial data',
    },
  });

  console.log('Database seeding completed successfully!');
  console.log('\n--- Test Accounts Created ---');
  console.log('Admin: john@doe.com / johndoe123');
  console.log('Client 1: maria.silva@email.com / password123');
  console.log('Client 2: joao.santos@email.com / password123');
  console.log('Delivery 1 (Active): carlos.entregador@email.com / password123');
  console.log('Delivery 2 (Active): ana.entregadora@email.com / password123');
  console.log('Delivery 3 (Pending): pedro.pendente@email.com / password123');
  console.log('\n--- Sample Data ---');
  console.log(`- ${4} orders created (1 delivered, 1 in transit, 2 pending)`);
  console.log('- System configurations set');
  console.log('- 1 rating created');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
