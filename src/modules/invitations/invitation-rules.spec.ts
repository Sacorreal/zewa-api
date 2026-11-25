import { unusableReason } from './invitation-rules';

const NOW = new Date('2026-11-25T12:00:00Z');
const future = new Date('2026-11-26T12:00:00Z');
const past = new Date('2026-11-24T12:00:00Z');

describe('unusableReason', () => {
  it('una invitación vigente puede usarse', () => {
    expect(
      unusableReason(
        { acceptedAt: null, revokedAt: null, expiresAt: future },
        NOW,
      ),
    ).toBeNull();
  });

  it('no puede usarse dos veces', () => {
    expect(
      unusableReason(
        { acceptedAt: past, revokedAt: null, expiresAt: future },
        NOW,
      ),
    ).toBe('ACCEPTED');
  });

  it('no puede usarse si fue reemplazada por un reenvío', () => {
    expect(
      unusableReason(
        { acceptedAt: null, revokedAt: past, expiresAt: future },
        NOW,
      ),
    ).toBe('REVOKED');
  });

  it('no puede usarse después de expirar (incluido el instante exacto)', () => {
    expect(
      unusableReason(
        { acceptedAt: null, revokedAt: null, expiresAt: past },
        NOW,
      ),
    ).toBe('EXPIRED');
    expect(
      unusableReason(
        { acceptedAt: null, revokedAt: null, expiresAt: NOW },
        NOW,
      ),
    ).toBe('EXPIRED');
  });
});
