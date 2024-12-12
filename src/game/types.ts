export enum PowerUpType {
  LowGravity,
  SmallSize,
  Invincibility
}

export interface PowerUpEffect {
  type: PowerUpType;
  expiresAt: number;
}