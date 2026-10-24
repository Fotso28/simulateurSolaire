import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiError } from '../common/api-error';
import { hashIp } from '../common/ip-hash';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './lead.dto';
import { CreateSimulationDto } from './simulation.dto';
import { SimulationsService } from './simulations.service';

@Controller()
export class SimulationsController {
  constructor(
    private readonly simulations: SimulationsService,
    private readonly prisma: PrismaService,
    private readonly env: Env,
  ) {}

  @Post('simulations')
  @HttpCode(201)
  create(@Body() dto: CreateSimulationDto) {
    return this.simulations.create(dto);
  }

  @Get('simulations/:shareToken')
  findOne(@Param('shareToken') shareToken: string) {
    return this.simulations.findByShareToken(shareToken);
  }

  /** Demande de devis : consentement obligatoire, IP conservée seulement hachée. */
  @Post('leads')
  @HttpCode(201)
  async createLead(@Body() dto: CreateLeadDto, @Req() req: Request) {
    let simulationId: string | null = null;
    if (dto.shareToken) {
      const sim = await this.prisma.simulation.findUnique({
        where: { shareToken: dto.shareToken },
        select: { id: true },
      });
      if (!sim)
        throw ApiError.badRequest(
          'UNKNOWN_SIMULATION',
          'Simulation introuvable.',
          'shareToken',
        );
      simulationId = sim.id;
    }
    const lead = await this.prisma.lead.create({
      data: {
        simulationId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        city: dto.city ?? null,
        message: dto.message ?? null,
        consentAt: new Date(),
        ipHash: hashIp(req.ip, this.env.IP_HASH_SECRET),
      },
      select: { id: true, createdAt: true },
    });
    return { id: lead.id, createdAt: lead.createdAt.toISOString() };
  }
}
