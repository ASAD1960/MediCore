import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { DEFAULT_ROLES, PERMISSIONS } from '../src/shared/constants/permissions';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid SEED_ADMIN_EMAIL environment variable is required.');
  }

  if (!password || password.length < 16) {
    throw new Error('SEED_ADMIN_PASSWORD is required and must be at least 16 characters.');
  }

  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  const perms = await prisma.permission.findMany();

  let org = await prisma.organization.findUnique({
    where: { registrationNumber: 'DEMO-001' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'MediCore Demo Clinic',
        organizationType: 'CLINIC',
        registrationNumber: 'DEMO-001',
        email: 'info@demo.clinic',
        timezone: 'Asia/Karachi',
      },
    });
  } else if (org.timezone === 'UTC') {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { timezone: 'Asia/Karachi' },
    });
  }

  const roleIds: Record<string, string> = {};

  for (const [name, permissions] of Object.entries(DEFAULT_ROLES)) {
    let role = await prisma.role.findFirst({
      where: { organizationId: org.id, name },
    });

    role ??= await prisma.role.create({
      data: { organizationId: org.id, name },
    });

    roleIds[name] = role.id;

    const keys: string[] =
      permissions === 'ALL'
        ? perms.map((permission) => permission.key)
        : permissions;

    await prisma.rolePermission.createMany({
      data: perms
        .filter((permission) => keys.includes(permission.key))
        .map((permission) => ({
          roleId: role!.id,
          permissionId: permission.id,
        })),
      skipDuplicates: true,
    });
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingAdmin) {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    await prisma.user.create({
      data: {
        organizationId: org.id,
        name: 'MediCore Administrator',
        email,
        passwordHash,
        userRoles: {
          create: {
            roleId: roleIds['Organization Administrator'],
          },
        },
      },
    });
  }

  await prisma.department.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'General Medicine',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'General Medicine',
    },
  });

  console.log('MediCore demo organization and initial configuration are ready.');
  console.log(existingAdmin
    ? 'The configured administrator already exists; its account was not changed.'
    : 'The initial administrator account was created.');
}

main()
  .catch((error) => {
    console.error('Production seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
