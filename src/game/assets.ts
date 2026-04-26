import * as ex from "excalibur";

export type SpriteKey = "slurpSlurp" | "frank" | "openTheCloset" | "ticket";
export type YudSpriteKey = "yudRed" | "yudBlue" | "yudGreen" | "yudYellow";
export type WalkSpriteKey = "mommyBall" | YudSpriteKey;
export type EnvironmentSpriteKey =
  | "cloudHills"
  | "housePink"
  | "houseLavender"
  | "houseYellow"
  | "houseBlue"
  | "school"
  | "rail"
  | "fence"
  | "sign"
  | "shrubLarge"
  | "shrubRound"
  | "shrubFlowers"
  | "treeSmall";

export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const resources = {
  sprites: new ex.ImageSource("/assets/generated/ballseat-sprite-sheet.png"),
  characterWalk: new ex.ImageSource("/assets/generated/character-walk.png"),
  town: new ex.ImageSource("/assets/generated/ballseat-town-elements.png"),
};

export const spriteFrames: Record<SpriteKey, SpriteFrame> = {
  slurpSlurp: { x: 1085, y: 199, width: 334, height: 269 },
  frank: { x: 53, y: 606, width: 423, height: 294 },
  openTheCloset: { x: 552, y: 600, width: 438, height: 320 },
  ticket: { x: 1075, y: 617, width: 421, height: 313 },
};

export const walkFrames: Record<WalkSpriteKey, [SpriteFrame, SpriteFrame]> = {
  mommyBall: [
    { x: 82, y: 76, width: 284, height: 245 },
    { x: 461, y: 77, width: 262, height: 247 },
  ],
  yudRed: [
    { x: 808, y: 72, width: 284, height: 256 },
    { x: 1171, y: 73, width: 281, height: 253 },
  ],
  yudBlue: [
    { x: 79, y: 399, width: 280, height: 256 },
    { x: 431, y: 399, width: 272, height: 255 },
  ],
  yudGreen: [
    { x: 814, y: 403, width: 274, height: 249 },
    { x: 1170, y: 403, width: 273, height: 251 },
  ],
  yudYellow: [
    { x: 82, y: 704, width: 274, height: 247 },
    { x: 429, y: 704, width: 272, height: 247 },
  ],
};

export const environmentFrames: Record<EnvironmentSpriteKey, SpriteFrame> = {
  cloudHills: { x: 1053, y: 690, width: 590, height: 207 },
  housePink: { x: 46, y: 141, width: 216, height: 222 },
  houseLavender: { x: 300, y: 157, width: 259, height: 205 },
  houseYellow: { x: 604, y: 161, width: 257, height: 206 },
  houseBlue: { x: 900, y: 165, width: 272, height: 202 },
  school: { x: 1201, y: 30, width: 453, height: 335 },
  rail: { x: 52, y: 413, width: 762, height: 111 },
  fence: { x: 866, y: 432, width: 419, height: 113 },
  sign: { x: 1365, y: 413, width: 238, height: 218 },
  shrubLarge: { x: 57, y: 563, width: 181, height: 85 },
  shrubRound: { x: 294, y: 559, width: 143, height: 93 },
  shrubFlowers: { x: 509, y: 578, width: 238, height: 78 },
  treeSmall: { x: 900, y: 731, width: 132, height: 163 },
};

export function loadGameResources(): Promise<void> {
  return Promise.all([
    resources.sprites.load(),
    resources.characterWalk.load(),
    resources.town.load(),
  ]).then(() => undefined);
}
