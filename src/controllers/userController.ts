import { Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../database/client';
import { AuthRequest } from '../middleware/auth';
import { logToDb } from '../utils/logger';

export const getUsers = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;

  try {
    const users = await prisma.user.findMany({
      where: { tenantId },
      include: { role: true },
    });

    return res.json({ users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role.name })) });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { name, email, password, roleName } = req.body;

  try {
    const role = await prisma.role.findFirst({ where: { name: roleName, tenantId } });
    if (!role) return res.status(400).json({ error: 'Role not found' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, roleId: role.id, tenantId },
    });

    await logToDb('create_user', `Admin created user: ${newUser.email}`, tenantId, req.user?.userId);
    return res.status(201).json({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: role.name } });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
