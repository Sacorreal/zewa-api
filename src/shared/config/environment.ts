export enum NodeEnv {
  Local = 'local',
  Develop = 'develop',
  Production = 'production',
}

const NODE_ENVS: readonly string[] = Object.values(NodeEnv);

export const isNodeEnv = (value: unknown): value is NodeEnv =>
  typeof value === 'string' && NODE_ENVS.includes(value);

export const resolveEnvFilePath = (nodeEnv: string | undefined): string =>
  `.env.${nodeEnv}`;
