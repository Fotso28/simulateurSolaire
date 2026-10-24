import { Controller, Get, Header, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CatalogService } from '../catalog/catalog.service';
import * as map from '../catalog/mappers';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  /** Pays avec leurs régions et l'ensoleillement. */
  @Get('countries')
  async countries() {
    const countries = await this.prisma.country.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { regions: { orderBy: { name: 'asc' } } },
    });
    return countries.map((c) => ({
      ...map.toCountry(c),
      regions: c.regions.map(map.toRegion),
    }));
  }

  /** Catalogue complet, avec ETag : `If-None-Match` identique → 304. */
  @Get('catalog')
  @Header('Cache-Control', 'no-cache')
  async getCatalog(@Req() req: Request, @Res() res: Response) {
    const { body, etag } = await this.catalog.getPublicCatalog();
    res.setHeader('ETag', etag);
    const ifNoneMatch = req.headers['if-none-match'];
    const tags = (ifNoneMatch ?? '')
      .split(',')
      .map((t) => t.trim().replace(/^W\//, ''));
    if (ifNoneMatch && (tags.includes(etag) || tags.includes('*'))) {
      res.status(304).end();
      return;
    }
    res.status(200).type('application/json').send(body);
  }
}
