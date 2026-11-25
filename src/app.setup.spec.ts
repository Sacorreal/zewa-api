import { parseTrustProxy } from './app.setup';
import type { EnvReader } from './shared/config/env-reader';

const readerWith =
  (value: string | undefined): EnvReader =>
  (key) =>
    key === 'TRUST_PROXY' ? value : undefined;

describe('parseTrustProxy', () => {
  it.each([
    [undefined, false],
    ['false', false],
    ['true', true],
    ['1', 1],
    ['loopback, 10.0.0.0/8', 'loopback, 10.0.0.0/8'],
  ])('TRUST_PROXY=%p → %p', (raw, expected) => {
    expect(parseTrustProxy(readerWith(raw))).toEqual(expected);
  });
});
