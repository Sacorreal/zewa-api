import { StorageDevModule } from './storage-dev.module';

describe('StorageDevModule.forEnvironment', () => {
  it('monta los endpoints de prueba en local', () => {
    expect(StorageDevModule.forEnvironment('local').imports).toHaveLength(1);
  });

  it.each(['develop', 'production', 'staging', '', undefined])(
    'no los monta en "%s"',
    (nodeEnv) => {
      expect(StorageDevModule.forEnvironment(nodeEnv).imports).toEqual([]);
    },
  );
});
