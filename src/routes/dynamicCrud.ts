import { Router, Request, Response } from 'express';
import prisma from '../database/client';

const router = Router();

// Plural to Singular mapping table for dynamic endpoints
const getModelName = (resource: string) => {
  const map: Record<string, string> = {
    'customers': 'customer',
    'products': 'product',
    'vehicles': 'vehicle',
    'orders': 'order',
    'orderitems': 'orderItem',
    'deliveries': 'delivery',
    'transactions': 'transaction',
    'debts': 'debt',
    'employeeadvances': 'employeeAdvance',
    'commissions': 'commission',
    'custom': 'customData'
  };
  return map[resource.toLowerCase()];
};

// GET ALL (Lists resource based on tenant)
router.get('/:resource', async (req: Request, res: Response) => {
  const model = getModelName(req.params.resource as string);
  if (!model) return res.status(404).json({ error: 'Endpoint CRUD Resource not found or mapped' });

  try {
    const tenantId = (req as any).user.tenantId; // Automatically taken from JWT
    
    // Tratativa Universal para CustomData
    if (model === 'customData') {
      const collectionName = req.query.collection as string;
      if (!collectionName) return res.status(400).json({ error: 'Missing collection query param (e.g. ?collection=impostos)' });
      
      const data = await prisma.customData.findMany({ where: { tenantId, collectionName } });
      return res.json({ data: data.map(item => ({ id: item.id, ...item.data as any, createdAt: item.createdAt })) });
    }

    // Tratativa Tradicional Fortemente Tipada
    const data = await (prisma as any)[model].findMany({ where: { tenantId } });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET ONE (Fetch specific item ID on tenant)
router.get('/:resource/:id', async (req: Request, res: Response) => {
  const model = getModelName(req.params.resource as string);
  if (!model) return res.status(404).json({ error: 'Endpoint CRUD Resource not found or mapped' });

  try {
    const tenantId = (req as any).user.tenantId;
    const item = await (prisma as any)[model].findFirst({ where: { id: req.params.id, tenantId } });
    if (!item) return res.status(404).json({ error: 'Not found or permission denied' });
    return res.json(item);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST (Create new item in tenant)
router.post('/:resource', async (req: Request, res: Response) => {
  const model = getModelName(req.params.resource as string);
  if (!model) return res.status(404).json({ error: 'Endpoint CRUD Resource not found or mapped' });

  try {
    const tenantId = (req as any).user.tenantId;
    
    if (model === 'customData') {
      const collectionName = req.query.collection as string;
      if (!collectionName) return res.status(400).json({ error: 'Missing collection query param for dynamic creation' });
      
      const item = await prisma.customData.create({
        data: { tenantId, collectionName, data: req.body }
      });
      return res.status(201).json({ id: item.id, ...item.data as any });
    }

    const dataToSave = { ...req.body, tenantId }; 
    const item = await (prisma as any)[model].create({ data: dataToSave });
    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT (Update existing item in tenant)
router.put('/:resource/:id', async (req: Request, res: Response) => {
  const model = getModelName(req.params.resource as string);
  if (!model) return res.status(404).json({ error: 'Endpoint CRUD Resource not found or mapped' });

  try {
    const tenantId = (req as any).user.tenantId;
    const dataToUpdate = { ...req.body };
    delete dataToUpdate.tenantId; // Security protection
    delete dataToUpdate.id;

    // Verify ownership before update
    const existing = await (prisma as any)[model].findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found or permission denied' });

    const item = await (prisma as any)[model].update({
      where: { id: req.params.id },
      data: dataToUpdate
    });
    return res.json(item);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE (Remove item from tenant)
router.delete('/:resource/:id', async (req: Request, res: Response) => {
  const model = getModelName(req.params.resource as string);
  if (!model) return res.status(404).json({ error: 'Endpoint CRUD Resource not found or mapped' });

  try {
    const tenantId = (req as any).user.tenantId;
    
    // Verify ownership before delete
    const existing = await (prisma as any)[model].findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: 'Not found or permission denied' });

    await (prisma as any)[model].delete({ where: { id: req.params.id } });
    return res.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
