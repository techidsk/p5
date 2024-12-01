import { RuntimeEffect } from "canvaskit-wasm";

import type { CanvasKit, Image, Surface, Paint } from "canvaskit-wasm";
import { DISPLACEMENT_SHADER, DisplacementOptions } from "./displacement";

export class DisplacementManager {
  private shader: RuntimeEffect | null = null;
  private paint: Paint | null = null;
  private surface: Surface | null = null;

  constructor(private canvasKit: CanvasKit) {
    this.initShader();
  }

  private initShader() {
    this.shader = this.canvasKit.RuntimeEffect.Make(DISPLACEMENT_SHADER);
    this.paint = new this.canvasKit.Paint();
  }

  public applyDisplacement(options: DisplacementOptions) {
    const {
      sourceImage,
      displacementMap,
      maskImage,
      strength,
      sourceX = 0,
      sourceY = 0,
    } = options;

    if (!this.shader || !this.paint) return;

    // 创建着色器和uniforms
    const uniforms = new Float32Array([
      strength,
      sourceX,
      sourceY,
      sourceImage.width(),
      sourceImage.height(),
      performance.now() / 1000,
    ]);

    // 创建着色器链
    const shaders = this.createShaderChain(
      sourceImage,
      displacementMap,
      maskImage
    );
    const finalShader = this.shader.makeShaderWithChildren(uniforms, shaders);
    this.paint.setShader(finalShader);

    return this.paint;
  }

  private createShaderChain(source: Image, dispMap: Image, mask?: Image) {
    const sourceShader = this.createImageShader(source);
    const dispShader = this.createImageShader(dispMap);
    const maskShader = mask
      ? this.createImageShader(mask)
      : this.createWhiteMaskShader();

    return [sourceShader, dispShader, maskShader];
  }

  private createImageShader(image: Image) {
    const recorder = new this.canvasKit.PictureRecorder();
    const canvas = recorder.beginRecording(
      this.canvasKit.LTRBRect(0, 0, image.width(), image.height())
    );
    canvas.drawImage(image, 0, 0);
    const picture = recorder.finishRecordingAsPicture();

    return picture.makeShader(
      this.canvasKit.TileMode.Clamp,
      this.canvasKit.TileMode.Clamp,
      this.canvasKit.FilterMode.Linear
    );
  }

  private createWhiteMaskShader() {
    // 创建白色遮罩着色器
    const recorder = new this.canvasKit.PictureRecorder();
    const canvas = recorder.beginRecording(this.canvasKit.LTRBRect(0, 0, 1, 1));
    const paint = new this.canvasKit.Paint();
    paint.setColor(this.canvasKit.WHITE);
    canvas.drawRect(this.canvasKit.LTRBRect(0, 0, 1, 1), paint);
    const picture = recorder.finishRecordingAsPicture();

    return picture.makeShader(
      this.canvasKit.TileMode.Clamp,
      this.canvasKit.TileMode.Clamp
    );
  }

  public dispose() {
    this.shader?.delete();
    this.paint?.delete();
    this.surface?.delete();
  }
}
