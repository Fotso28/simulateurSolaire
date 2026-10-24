import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  CLIENT_ERRORS_CONFIG,
  ClientErrorHandler,
  safePath,
  scrub,
} from './client-error-handler';

describe('ClientErrorHandler', () => {
  const realFetch = globalThis.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    jest.restoreAllMocks();
  });

  function setup(config = { enabled: true, sampleRate: 1, maxPerSession: 2 }) {
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useClass: ClientErrorHandler },
        { provide: CLIENT_ERRORS_CONFIG, useValue: config },
      ],
    });
    return TestBed.inject(ErrorHandler);
  }

  it('journalise et envoie une erreur sans données personnelles', () => {
    setup().handleError(
      new Error('Échec pour jean@exemple.fr au +237 699 00 00 00'),
    );
    expect(console.error).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/client-errors');
    const body = JSON.parse(init.body);
    expect(body.message).toBe('Échec pour [email] au [nombre]');
    expect(body.kind).toBe('error');
  });

  it('dédoublonne et plafonne les envois', () => {
    const handler = setup();
    const err = new Error('boum');
    handler.handleError(err);
    handler.handleError(err);
    handler.handleError(new Error('autre'));
    handler.handleError(new Error('encore'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('n’envoie rien si désactivé ou hors échantillon', () => {
    setup({ enabled: false, sampleRate: 1, maxPerSession: 10 }).handleError(
      new Error('x'),
    );
    TestBed.resetTestingModule();
    setup({ enabled: true, sampleRate: 0, maxPerSession: 10 }).handleError(
      new Error('y'),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it('masque les identifiants dans le chemin et les jetons', () => {
    expect(safePath('/s/AbCdEf123456789xyz')).toBe('/s/:id');
    expect(safePath('/particulier/resultat')).toBe('/particulier/resultat');
    expect(scrub('token=abcdefghijklmnopqrstuvwxyz')).toBe('token=[jeton]');
  });
});
