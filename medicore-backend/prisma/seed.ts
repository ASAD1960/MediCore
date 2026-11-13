import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { DEFAULT_ROLES, PERMISSIONS } from '../src/shared/constants/permissions';

const prisma = new PrismaClient();

async function main() {
  for (const key of PERMISSIONS) await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  const perms = await prisma.permission.findMany();

  let org = await prisma.organization.findUnique({ where: { registrationNumber: 'DEMO-001' } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Demo Clinic',
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
  for (const [name, p] of Object.entries(DEFAULT_ROLES)) {
    let role = await prisma.role.findFirst({ where: { organizationId: org.id, name } });
    role ??= await prisma.role.create({ data: { organizationId: org.id, name } });
    roleIds[name] = role.id;
    const keys: string[] = p === 'ALL' ? perms.map((x) => x.key) : p;

    await prisma.rolePermission.createMany({ data: perms.filter((x) => keys.includes(x.key)).map((x) => ({ roleId: role!.id, permissionId: x.id })), skipDuplicates: true });
  }

  const email = 'admin@demo.clinic';
  if (!(await prisma.user.findUnique({ where: { email } }))) {
    await prisma.user.create({
      data: { organizationId: org.id, name: 'Demo Admin', email, passwordHash: await argon2.hash('Admin@12345', { type: argon2.argon2id }),
        userRoles: { create: { roleId: roleIds['Organization Administrator'] } } },
    });
  }
  await prisma.department.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'General Medicine' } },
    update: {}, create: { organizationId: org.id, name: 'General Medicine' },
  });
  console.log('Seeded. Login: admin@demo.clinic / Admin@12345 (dev only, change immediately)');
}
main().finally(() => prisma.$disconnect());
