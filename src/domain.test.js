import { describe, expect, it } from 'vitest';
import { campaignUrl, safeReturnPath, toCsv, validateRegistration, validateRoster } from './domain';

describe('registration and export helpers', () => {
  it('requires a named roster and terms acceptance', () => {
    expect(validateRoster([{ name: 'Arjun' }])).toBe(true);
    expect(validateRoster([{ name: ' ' }])).toBe(false);
    const errors = validateRegistration({ formFields: [], deadline: '' }, { teamName: 'KMT XI', captainName: 'Ravi', email: 'ravi@example.com', phone: '+91 99999 88888', players: [{ name: 'Ravi' }], acceptedTerms: false, paymentMethod: 'offline' });
    expect(errors.acceptedTerms).toBeTruthy();
  });

  it('escapes CSV and neutralizes spreadsheet formulas', () => {
    const csv = toCsv([{ teamName: '=HYPERLINK("x")', captainName: 'A"B', players: [{ name: 'One' }] }]);
    expect(csv).toContain(`'=HYPERLINK(""x"")`);
    expect(csv).toContain('"A""B"');
  });

  it('keeps campaign links and return paths on the current site', () => {
    expect(campaignUrl('cup one', 'whatsapp', 'summer', 'https://kmt.example')).toBe('https://kmt.example/t/cup%20one?utm_source=whatsapp&utm_campaign=summer');
    expect(safeReturnPath('//evil.example')).toBe('/user/dashboard');
    expect(safeReturnPath('/admin')).toBe('/admin');
  });
});
