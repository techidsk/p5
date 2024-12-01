import type { CanvasKit, Image, Surface } from "canvaskit-wasm";

export interface DisplacementOptions {
  sourceImage: Image;
  displacementMap: Image;
  maskImage?: Image;
  strength: number;
  sourceX?: number;
  sourceY?: number;
}
// 优化后的置换着色器代码
export const DISPLACEMENT_SHADER = `
    uniform shader iSource;
    uniform shader iDispMap;
    uniform shader iMask;
    uniform float iStrength;
    uniform vec2 iSourcePos;
    uniform vec2 iResolution;
    uniform float iTime;

    vec4 main(vec2 coord) {
        // 归一化坐标
        vec2 uv = coord / iResolution;
        
        // 获取置换图的 RGB 值作为位移向量
        vec4 dispColor = iDispMap.eval(coord);
        vec2 dispVector = (dispColor.rg - 0.5) * 2.0;
        
        // 获取遮罩值
        vec4 maskColor = iMask.eval(coord);
        float maskStrength = (maskColor.r + maskColor.g + maskColor.b) / 3.0;
        
        // 计算位移
        vec2 offset = dispVector * iStrength * maskStrength;
        
        // 应用位移和源图像位置
        vec2 sourceCoord = coord - iSourcePos + offset;
        vec4 sourceColor = iSource.eval(sourceCoord);
        
        // 平滑边缘
        float edge = smoothstep(0.0, 1.0, maskStrength);
        
        return vec4(sourceColor.rgb, sourceColor.a * edge);
    }
  `;
  
export function applyDisplacement(
  canvasKit: CanvasKit,
  surface: Surface,
  options: DisplacementOptions
) {
  const {
    sourceImage,
    displacementMap,
    maskImage,
    strength,
    sourceX = 0,
    sourceY = 0,
  } = options;
  const canvas = surface.getCanvas();

  let paint, sourceShader, dispShader, maskShader, finalShader,
      sourcePicture, dispPicture, maskPicture,
      sourceRecorder, dispRecorder, maskRecorder;
      
  try {
    if (DISPLACEMENT_SHADER) {
      paint = new canvasKit.Paint();

      // 创建源图像的着色器
      sourceRecorder = new canvasKit.PictureRecorder();
      const sourceCanvas = sourceRecorder.beginRecording(
        canvasKit.LTRBRect(0, 0, sourceImage.width(), sourceImage.height())
      );
      sourceCanvas.drawImage(sourceImage, 0, 0);
      sourcePicture = sourceRecorder.finishRecordingAsPicture();

      // 创建置换图的着色器
      dispRecorder = new canvasKit.PictureRecorder();
      const dispCanvas = dispRecorder.beginRecording(
        canvasKit.LTRBRect(0, 0, sourceImage.width(), sourceImage.height())
      );
      dispCanvas.drawImage(displacementMap, 0, 0);
      dispPicture = dispRecorder.finishRecordingAsPicture();

      // 创建遮罩的着色器
      maskRecorder = new canvasKit.PictureRecorder();
      const maskCanvas = maskRecorder.beginRecording(
        canvasKit.LTRBRect(0, 0, sourceImage.width(), sourceImage.height())
      );
      if (maskImage) {
        maskCanvas.drawImage(maskImage, 0, 0);
      } else {
        // 如果没有遮罩，创建一个全白遮罩
        const paint = new canvasKit.Paint();
        paint.setColor(canvasKit.WHITE);
        maskCanvas.drawRect(
          canvasKit.LTRBRect(0, 0, sourceImage.width(), sourceImage.height()),
          paint
        );
        paint.delete();
      }
      maskPicture = maskRecorder.finishRecordingAsPicture();

      // 创建所有着色器
      sourceShader = sourcePicture.makeShader(
        canvasKit.TileMode.Clamp,
        canvasKit.TileMode.Clamp,
        canvasKit.FilterMode.Linear
      );

      dispShader = dispPicture.makeShader(
        canvasKit.TileMode.Clamp,
        canvasKit.TileMode.Clamp,
        canvasKit.FilterMode.Linear
      );

      maskShader = maskPicture.makeShader(
        canvasKit.TileMode.Clamp,
        canvasKit.TileMode.Clamp,
        canvasKit.FilterMode.Linear
      );

      // 设置 uniforms 和 children
      const uniforms = new Float32Array([strength, sourceX, sourceY]);
      const children = [sourceShader, dispShader, maskShader];

      const runtimeEffect = canvasKit.RuntimeEffect.Make(DISPLACEMENT_SHADER);
      if (!runtimeEffect) {
        throw new Error('Failed to compile displacement shader');
      }
      finalShader = runtimeEffect.makeShaderWithChildren(uniforms, children);
      paint.setShader(finalShader);

      // 绘制结果
      canvas.clear(canvasKit.TRANSPARENT);
      canvas.drawRect(
        canvasKit.LTRBRect(0, 0, sourceImage.width(), sourceImage.height()),
        paint
      );
    }
  } finally {
    // 清理资源
    if (paint) paint.delete();
    if (finalShader) finalShader.delete();
    if (sourceShader) sourceShader.delete();
    if (dispShader) dispShader.delete();
    if (maskShader) maskShader.delete();
    if (sourcePicture) sourcePicture.delete();
    if (dispPicture) dispPicture.delete();
    if (maskPicture) maskPicture.delete();
    if (sourceRecorder) sourceRecorder.delete();
    if (dispRecorder) dispRecorder.delete();
    if (maskRecorder) maskRecorder.delete();
  }

  surface.flush();
}
