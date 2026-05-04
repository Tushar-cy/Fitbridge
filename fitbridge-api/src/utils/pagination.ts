import { Request } from 'express';
import { PaginationMeta } from '../types/models.types';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(req: Request, defaultLimit = 10): PaginationOptions {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? String(defaultLimit)), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  const total_pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1,
  };
}
