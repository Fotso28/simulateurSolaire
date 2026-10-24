import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { simulate } from '@simulateur/engine';
import type {
  SimulationInput,
  SimulationResult,
} from '@simulateur/shared-types';
import { randomBytes } from 'node:crypto';
import { CatalogService } from '../catalog/catalog.service';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { findDivergence, RESULT_TOLERANCE } from './compare-results';
import { CreateSimulationDto } from './simulation.dto';

/** Jeton de partage : 144 bits aléatoires, encodés en base64url (24 caractères). */
export const newShareToken = () => randomBytes(18).toString('base64url');

const asJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

@Injectable()
export class SimulationsService {
  private readonly logger = new Logger(SimulationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  async create(dto: CreateSimulationDto): Promise<{ shareToken: string }> {
    const input = dto.input as SimulationInput;
    if (!input.loads?.length && !input.totals) {
      throw ApiError.badRequest(
        'VALIDATION_ERROR',
        'Indiquez des appareils ou des totaux de consommation.',
        'input.loads',
      );
    }
    const region = await this.prisma.region.findUnique({
      where: { id: input.regionId },
    });
    if (!region) {
      throw ApiError.badRequest(
        'UNKNOWN_REGION',
        'Région inconnue.',
        'input.regionId',
      );
    }
    const paramsVersion = dto.result['paramsVersion'];
    if (typeof paramsVersion !== 'number' || !Number.isInteger(paramsVersion)) {
      throw ApiError.badRequest(
        'VALIDATION_ERROR',
        'La version des paramètres de calcul est manquante.',
        'result.paramsVersion',
      );
    }
    const params = await this.catalog.getParameterSetByVersion(paramsVersion);
    if (!params) {
      throw ApiError.badRequest(
        'UNKNOWN_PARAMS_VERSION',
        'Version des paramètres de calcul inconnue.',
        'result.paramsVersion',
      );
    }

    const catalog = await this.catalog.getCatalog(true);
    let replayed: SimulationResult;
    try {
      replayed = simulate(input, catalog, params);
    } catch (error) {
      this.logger.warn(`Rejeu impossible : ${(error as Error).message}`);
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'REPLAY_FAILED',
        'Le serveur n’a pas pu rejouer le calcul de cette simulation.',
      );
    }
    const divergence = findDivergence(replayed, dto.result, RESULT_TOLERANCE);
    if (divergence) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'RESULT_MISMATCH',
        'Le résultat envoyé diffère du calcul du serveur de plus de 1 %.',
        `result.${divergence}`,
      );
    }

    const { overrides, ...inputs } = input;
    const shareToken = newShareToken();
    await this.prisma.simulation.create({
      data: {
        mode: input.mode,
        regionId: input.regionId,
        autonomyDays: input.autonomyDays,
        batteryTech: input.batteryTech,
        inputs: asJson(inputs),
        overrides: overrides ? asJson(overrides) : Prisma.DbNull,
        result: asJson(replayed),
        engineVersion: replayed.engineVersion,
        paramsVersion: replayed.paramsVersion,
        shareToken,
      },
    });
    return { shareToken };
  }

  async findByShareToken(shareToken: string) {
    const sim = await this.prisma.simulation.findUnique({
      where: { shareToken },
    });
    if (!sim) throw ApiError.notFound('Simulation introuvable.');
    const input = {
      ...(sim.inputs as object),
      ...(sim.overrides ? { overrides: sim.overrides } : {}),
    } as SimulationInput;
    return {
      shareToken: sim.shareToken,
      input,
      result: sim.result as unknown as SimulationResult,
      engineVersion: sim.engineVersion,
      paramsVersion: sim.paramsVersion,
      createdAt: sim.createdAt.toISOString(),
    };
  }
}
