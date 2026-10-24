import { NotFoundException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Prisma } from '@prisma/client';
import { ApiError } from './api-error';
import { toErrorResponse } from './http-exception.filter';
import { validationErrorToApiError } from './validation';

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('x', {
    code,
    clientVersion: '6',
    meta,
  });

describe('format d’erreur unique', () => {
  it('convertit une erreur d’analyseur de corps (corps trop gros) en 413', () => {
    const err = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
      type: 'entity.too.large',
    });
    expect(toErrorResponse(err)).toEqual({
      status: 413,
      body: { code: 'PAYLOAD_TOO_LARGE', message: 'Contenu trop volumineux.' },
    });
  });

  it('conserve le corps d’une ApiError', () => {
    const { status, body } = toErrorResponse(
      ApiError.badRequest('X', 'Message.', 'champ'),
    );
    expect(status).toBe(400);
    expect(body).toEqual({ code: 'X', message: 'Message.', field: 'champ' });
  });

  it('traduit les exceptions HTTP de Nest', () => {
    expect(toErrorResponse(new NotFoundException()).body).toEqual({
      code: 'NOT_FOUND',
      message: 'Ressource introuvable.',
    });
  });

  it('traduit les erreurs Prisma connues', () => {
    expect(
      toErrorResponse(prismaError('P2002', { target: ['email'] })),
    ).toEqual({
      status: 409,
      body: {
        code: 'ALREADY_EXISTS',
        message: expect.any(String),
        field: 'email',
      },
    });
    expect(toErrorResponse(prismaError('P2025')).status).toBe(404);
    expect(toErrorResponse(prismaError('P2003')).status).toBe(409);
  });

  it('masque les erreurs inattendues', () => {
    expect(toErrorResponse(new Error('secret'))).toEqual({
      status: 500,
      body: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur.' },
    });
  });

  it('produit un message de validation en français avec le chemin du champ', () => {
    const child = Object.assign(new ValidationError(), {
      property: 'quantity',
      constraints: { min: 'quantity must not be less than 1' },
    });
    const parent = Object.assign(new ValidationError(), {
      property: 'loads',
      children: [
        Object.assign(new ValidationError(), {
          property: '0',
          children: [child],
        }),
      ],
    });
    const body = validationErrorToApiError([parent]).getResponse();
    expect(body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Le champ « loads.0.quantity » est trop petit.',
      field: 'loads.0.quantity',
    });
  });

  it('garde un message personnalisé en français', () => {
    const err = Object.assign(new ValidationError(), {
      property: 'consent',
      constraints: { equals: 'Votre consentement est nécessaire.' },
    });
    expect(validationErrorToApiError([err]).getResponse()).toMatchObject({
      message: 'Votre consentement est nécessaire.',
    });
  });
});
