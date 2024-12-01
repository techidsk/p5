import type { Image } from "canvaskit-wasm";

// export const BLEND_MODES = {
//   normal: "SrcOver",
//   multiply: "Multiply",
//   screen: "Screen",
//   overlay: "Overlay",
//   darken: "Darken",
//   lighten: "Lighten",
//   "color-dodge": "ColorDodge",
//   "color-burn": "ColorBurn",
//   "hard-light": "HardLight",
//   "soft-light": "SoftLight",
//   difference: "Difference",
//   exclusion: "Exclusion",
//   hue: "Hue",
//   saturation: "Saturation",
//   color: "Color",
//   luminosity: "Luminosity",
// } as const;
// 定义所有可用的混合模式

// Porter-Duff Blend Modes 和 Artistic Blend Modes
export const BLEND_MODES = {
  Clear: true,
  Src: true,
  Dst: true,
  SrcOver: true,
  DstOver: true,
  SrcIn: true,
  DstIn: true,
  SrcOut: true,
  DstOut: true,
  SrcATop: true,
  DstATop: true,
  Xor: true,
  Plus: true,
  Modulate: true,
  Screen: true,
  Overlay: true,
  Darken: true,
  Lighten: true,
  ColorDodge: true,
  ColorBurn: true,
  HardLight: true,
  SoftLight: true,
  Difference: true,
  Exclusion: true,
  Multiply: true,
} as const;

export type BlendMode = (typeof BLEND_MODES)[keyof typeof BLEND_MODES];
export type BlendModeName = keyof typeof BLEND_MODES;

/**
 * 表示画布上的单个图片对象
 * @interface ImageObject
 * @property {string} id - 唯一标识符
 * @property {Image} image - CanvasKit 图片实例
 * @property {string} name - 图片名称
 * @property {number} x - X 坐标位置
 * @property {number} y - Y 坐标位置
 * @property {number} scale - 缩放比例
 * @property {number} rotation - 旋转角度
 * @property {BlendModeName} [blendMode] - 可选的混合模式
 * @property {number} [opacity] - 可选的透明度
 */
export interface ImageObject {
  id: string;
  image: Image;
  name: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  blendMode?: BlendModeName;
  opacity?: number;
}
