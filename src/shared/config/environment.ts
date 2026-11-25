export enum NodeEnv {
  Local = 'local',
  Develop = 'develop',
  Production = 'production',
  Test = 'test',
}

const NODE_ENVS: readonly string[] = Object.values(NodeEnv);

/** Ambientes que se conectan a PostgreSQL por host/usuario (sin DATABASE_URL). */
const HOST_CONNECTION_ENVS: readonly string[] = [NodeEnv.Local, NodeEnv.Test];

export const isNodeEnv = (value: unknown): value is NodeEnv =>
  typeof value === 'string' && NODE_ENVS.includes(value);

export const usesHostConnection = (value: unknown): boolean =>
  typeof value === 'string' && HOST_CONNECTION_ENVS.includes(value);

export const resolveEnvFilePath = (nodeEnv: string | undefined): string =>
  `.env.${nodeEnv}`;
