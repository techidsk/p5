import type { CanvasKit, Image, Surface } from "canvaskit-wasm";

interface DisplacementOptions {
  sourceImage: Image;
  displacementMap: Image;
  maskImage?: Image;
  strength: number;
  sourceX?: number;
  sourceY?: number;
}

export function applyDisplacement(
  canvasKit: CanvasKit,
  surface: Surface,
  options: DisplacementOptions
) {
  const { sourceImage, displacementMap, maskImage, strength, sourceX = 0, sourceY = 0 } = options;
  const canvas = surface.getCanvas();

  // 修改着色器程序，添加遮罩处理
  const shader = canvasKit.RuntimeEffect.Make(`
    uniform shader iSource;      // 原始图片
    uniform shader iDispMap;     // 置换贴图
    uniform shader iMask;        // 遮罩图片
    uniform float iStrength;     // 扭曲强度
    uniform vec2 iSourcePos;     // 源图像位置

    vec4 main(vec2 coord) {
      // 应用源图像位置偏移
      vec2 sourceCoord = coord - iSourcePos;
      
      // 获取置换贴图在当前坐标的颜色值
      vec4 displacement = iDispMap.eval(coord);
      
      // 将颜色值从 [0,1] 映射到 [-1,1] 范围
      vec2 offset = (displacement.rg - 0.5) * 2.0;
      
      // 应用强度并采样原始图片
      vec2 newCoord = sourceCoord + offset * iStrength;
      vec4 color = iSource.eval(newCoord);

      // 应用遮罩
      vec4 mask = iMask.eval(coord);
      float maskValue = (mask.r + mask.g + mask.b) / 3.0;
      
      return vec4(color.rgb, color.a * maskValue);
    }
  `);

  if (shader) {
    const paint = new canvasKit.Paint();

    // 创建源图像的着色器
    const sourceRecorder = new canvasKit.PictureRecorder();
    const sourceCanvas = sourceRecorder.beginRecording(
      canvasKit.LTRBRect(0, 0, sourceImage.width(), sourceImage.height())
    );
    sourceCanvas.drawImage(sourceImage, 0, 0);
    const sourcePicture = sourceRecorder.finishRecordingAsPicture();

    // 创建置换图的着色器
    const dispRecorder = new canvasKit.PictureRecorder();
    const dispCanvas = dispRecorder.beginRecording(
      canvasKit.LTRBRect(0, 0, sourceImage.width(), sourceImage.height())
    );
    dispCanvas.drawImage(displacementMap, 0, 0);
    const dispPicture = dispRecorder.finishRecordingAsPicture();

    // 创建遮罩的着色器
    const maskRecorder = new canvasKit.PictureRecorder();
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
    const maskPicture = maskRecorder.finishRecordingAsPicture();

    // 创建所有着色器
    const sourceShader = sourcePicture.makeShader(
      canvasKit.TileMode.Clamp,
      canvasKit.TileMode.Clamp,
      canvasKit.FilterMode.Linear
    );

    const dispShader = dispPicture.makeShader(
      canvasKit.TileMode.Clamp,
      canvasKit.TileMode.Clamp,
      canvasKit.FilterMode.Linear
    );

    const maskShader = maskPicture.makeShader(
      canvasKit.TileMode.Clamp,
      canvasKit.TileMode.Clamp,
      canvasKit.FilterMode.Linear
    );

    // 设置 uniforms 和 children
    const uniforms = new Float32Array([strength, sourceX, sourceY]);
    const children = [sourceShader, dispShader, maskShader];

    const finalShader = shader.makeShaderWithChildren(uniforms, children);
    paint.setShader(finalShader);

    // 绘制结果
    canvas.clear(canvasKit.TRANSPARENT);
    canvas.drawRect(
      canvasKit.LTRBRect(0, 0, sourceImage.width(), sourceImage.height()),
      paint
    );

    // 清理资源
    paint.delete();
    shader.delete();
    sourceShader.delete();
    dispShader.delete();
    maskShader.delete();
    finalShader.delete();
    sourcePicture.delete();
    dispPicture.delete();
    maskPicture.delete();
    sourceRecorder.delete();
    dispRecorder.delete();
    maskRecorder.delete();
  }

  surface.flush();
}
