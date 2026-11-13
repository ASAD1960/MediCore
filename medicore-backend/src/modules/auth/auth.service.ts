import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/environment';
import { AppError } from '../../shared/errors/AppError';

let dummyHash: Promise<string> | undefined;

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { organization: true } });
  // Always run a verify so response time doesn't reveal whether the email exists.
  dummyHash ??= argon2.hash('dummy-password', { type: argon2.argon2id });
  const valid = await argon2.verify(user ? user.passwordHash : await dummyHash, password);
  if (!user || !valid) throw new AppError(401, 'Invalid email or password');
  if (user.status !== 'ACTIVE') throw new AppError(403, 'Account is inactive');
  if (user.organization && user.organization.status !== 'ACTIVE') throw new AppError(403, 'Organization is inactive');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
  return { token, user };
}

export const hashPassword = (p: string) => argon2.hash(p, { type: argon2.argon2id });
