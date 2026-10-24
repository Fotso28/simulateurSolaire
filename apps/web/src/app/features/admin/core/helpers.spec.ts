import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { diffEntries } from '../audit/audit-page';
import {
  flattenValues,
  parseList,
  unflattenValues,
} from '../parameters/parameter-values';
import { parseDecimal } from '../ui/format';
import { applyServerError, toApiError } from './api-error';

describe('helpers du back-office', () => {
  it('toApiError lit { code, message, field } ou fournit un message français', () => {
    const body = { code: 'ACCOUNT_LOCKED', message: 'Compte verrouillé.' };
    expect(
      toApiError(new HttpErrorResponse({ status: 423, error: body })),
    ).toEqual(body);
    expect(toApiError(new HttpErrorResponse({ status: 0 })).message).toMatch(
      /joindre le serveur/,
    );
    expect(toApiError(new Error('x')).code).toBe('UNKNOWN');
  });

  it('applyServerError marque le champ désigné par `field`', () => {
    const form = new FormGroup({ name: new FormControl('a') });
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Trop court.',
        field: 'name',
      },
    });
    expect(applyServerError(form, error)).toBe(true);
    expect(form.controls.name.errors).toEqual({ server: 'Trop court.' });
    expect(applyServerError(form, new HttpErrorResponse({ status: 500 }))).toBe(
      false,
    );
  });

  it('parseDecimal accepte la virgule et refuse le texte', () => {
    expect(parseDecimal('1 000,5')).toBe(1000.5);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });

  it('aplatit puis reconstruit les paramètres imbriqués', () => {
    const values = {
      dodLithium: 0.8,
      autonomySteps: [1, 2],
      voltageThresholds: { max12V: { pvWp: 1000 } },
    };
    const flat = flattenValues(values);
    expect(flat.map((e) => e.path)).toEqual([
      'dodLithium',
      'autonomySteps',
      'voltageThresholds.max12V.pvWp',
    ]);
    expect(unflattenValues(flat)).toEqual(values);
    expect(parseList('0,5 ; 1 ;2')).toEqual([0.5, 1, 2]);
    expect(parseList('1 ; a')).toBeNull();
  });

  it('diffEntries signale les champs modifiés', () => {
    const rows = diffEntries(
      { name: 'A', active: true },
      { name: 'B', active: true, x: 1 },
    );
    expect(rows.filter((r) => r.changed).map((r) => r.key)).toEqual([
      'name',
      'x',
    ]);
  });
});
