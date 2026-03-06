import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../database/client';
import { logToDb } from '../utils/logger';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtforlocaldev';

// NEW: Automatically create tenant, plan, subscription and user
export const registerTenant = async (req: Request, res: Response) => {
  const { tenantName, email, password, name } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    // Find the default "Free" plan to attach trial
    const freePlan = await prisma.plan.findFirst({ where: { name: 'Free' } });
    if (!freePlan) return res.status(500).json({ error: 'Default plan missing. Seed the database.' });

    // Begin single transaction safely
    const newTenant = await prisma.tenant.create({ data: { name: tenantName } });

    // Automatically create a Trial subscription
    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + freePlan.trialDays);

    await prisma.subscription.create({
      data: {
        tenantId: newTenant.id,
        planId: freePlan.id,
        status: 'trial',
        startDate,
        expiresAt,
      },
    });

    // Create Admin roles automatically
    const adminRole = await prisma.role.create({
      data: {
        name: 'admin',
        tenantId: newTenant.id,
        permissions: {
          create: [
            { action: 'all', resource: 'all', tenantId: newTenant.id },
          ],
        },
      },
    });

    await prisma.role.create({ data: { name: 'user', tenantId: newTenant.id } }); // Default regular
    
    // Hash password & generate verification token
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        roleId: adminRole.id,
        tenantId: newTenant.id,
        verificationToken,
        isEmailVerified: true, // Ignorando trava temporariamente
      },
    });

    // Fire Email Integration asynchronously
    // sendVerificationEmail(user.email, verificationToken);

    await logToDb('register_tenant', `Tenant and Admin created: ${user.email}`, newTenant.id, user.id, req.ip, req.get('user-agent'));
    return res.status(201).json({ message: 'Tenant successfully registered. Please verify your email.', tenant: newTenant.id });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Original Register - adds user to existing tenant
export const register = async (req: Request, res: Response) => {
  const { tenantId, email, password, name, roleName } = req.body;

  try {
    const role = await prisma.role.findFirst({
      where: { name: roleName || 'user', tenantId },
    });

    if (!role) return res.status(400).json({ error: 'Role not found for this tenant' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: { tenantId, email, password: hashedPassword, name, roleId: role.id, verificationToken, isEmailVerified: true },
    });

    // sendVerificationEmail(user.email, verificationToken);

    await logToDb('register_user', `User registered: ${user.email}`, tenantId, user.id, req.ip, req.get('user-agent'));
    return res.status(201).json({ message: 'User registered successfully. Check email.' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.body;
  
  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    const user = await prisma.user.findUnique({ where: { verificationToken: token } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, verificationToken: null },
    });

    await logToDb('email_verified', `Email verified: ${user.email}`, user.tenantId, user.id, req.ip);
    return res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    // if (!user.isEmailVerified) return res.status(403).json({ error: 'Email requires verification' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role.name },
      JWT_SECRET,
      { expiresIn: '15m' } // Shorter access token for security
    );

    const refreshTokenString = crypto.randomBytes(64).toString('hex');

    await prisma.session.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        token: refreshTokenString,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days valid refresh
      },
    });

    await logToDb('login', `User logged in: ${user.email}`, user.tenantId, user.id, req.ip, req.get('user-agent'));
    return res.json({ token, refreshToken: refreshTokenString, user: { id: user.id, email: user.email, name: user.name, role: user.role.name, tenantId: user.tenantId } });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const { refreshToken } = req.body; // Can be optional, but useful if they want to kill a specific token

  try {
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { token: refreshToken } });
    }
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'If email exists, a token has been sent' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpires: resetExpires },
    });

    sendPasswordResetEmail(user.email, resetToken);
    
    return res.json({ message: 'If email exists, a token has been sent' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  
  try {
    const user = await prisma.user.findUnique({ where: { resetPasswordToken: token } });
    
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: 'Token is invalid or has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetPasswordToken: null, resetPasswordExpires: null },
    });
    
    await logToDb('password_reset', `User reset password: ${user.email}`, user.tenantId, user.id, req.ip);
    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh Token is required' });

  try {
    const session = await prisma.session.findUnique({ where: { token: refreshToken }, include: { user: { include: { role: true } } } });
    
    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } }); // Clear expired
      return res.status(401).json({ error: 'Refresh token expired or invalid. Please login again.' });
    }

    // Refresh valid - issue new single use access token
    const newToken = jwt.sign(
      { userId: session.user.id, tenantId: session.user.tenantId, role: session.user.role.name },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({ token: newToken });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
