import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { audienceService } from '../services/audience.service';

const parseLimit = (value: unknown, fallback = 50) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.min(numeric, 200);
};

class AudienceController {
  async list(_req: AuthRequest, res: Response) {
    const items = await audienceService.listAudiences();
    res.json({ items });
  }

  async get(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const audience = await audienceService.getAudience(id);
    res.json({ audience });
  }

  async create(req: AuthRequest, res: Response) {
    const result = await audienceService.createAudience(req.body, req.user?.id);
    res.status(201).json(result);
  }

  async update(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const result = await audienceService.updateAudience(id, req.body);
    res.json(result);
  }

  async remove(req: AuthRequest, res: Response) {
    const { id } = req.params;
    await audienceService.deleteAudience(id);
    res.status(204).send();
  }

  async previewFilters(req: AuthRequest, res: Response) {
    const limit = parseLimit(req.query.limit);
    const result = await audienceService.previewFilters(req.body?.filters || {}, limit);
    res.json(result);
  }

  async previewAudience(req: AuthRequest, res: Response) {
    const limit = parseLimit(req.query.limit);
    const { id } = req.params;
    const result = await audienceService.previewAudience(id, limit);
    res.json(result);
  }
}

export default new AudienceController();
