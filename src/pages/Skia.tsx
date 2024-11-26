import type { EmbindEnumEntity } from "canvaskit-wasm";
import { useCallback, useEffect, useRef } from "react";
import { LayerPanel } from "../components/LayerPanel";
import { applyDisplacement } from "../utils/displacement";

import imageList from "../assets/mock/imageList.json";
import { BLEND_MODES } from "../components/LayerItem";
import { useCanvasKitStore } from "../store/canvasKitStore";
import { ImageObject, useImageStore } from "../store/imageStore";
import { useMockupStore } from "../store/mockupStore";

export default function SkiaPage() {
  const CANVAS_ID = "main-canvas";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    initialize,
    createSurface,
    resizeSurface,
    getActiveSurface,
    getCanvasKit,
    cleanup,
    transform,
    isPanning,
    startPanning,
    updatePanning,
    stopPanning,
    handleWheel: handleWheelStore,
  } = useCanvasKitStore();

  const {
    images,
    selectedImage,
    addImage,
    selectImage,
    deleteImage,
    updateImageContent,
    createDerivedImage,
    handleImageClick,
    startDragging,
    handleDrag,
    stopDragging,
    clearSelection,
  } = useImageStore();

  const { loadMockupById, saveMockupData, currentMockup, isLoading } =
    useMockupStore();

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const canvasKit = getCanvasKit();
    if (!canvasKit || !event.target.files?.[0]) {
      console.error("CanvasKit 或文件未准备好");
      return;
    }

    const file = event.target.files[0];
    const arrayBuffer = await file.arrayBuffer();

    const image = canvasKit.MakeImageFromEncoded(new Uint8Array(arrayBuffer));

    if (image) {
      addImage(image, file.name);
    }
  };

  // Simplified mouse event handlers using store functions
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.button === 1) {
      startPanning(e.clientX, e.clientY);
      return;
    }

    const adjustedX = (e.clientX - rect.left - transform.x) / transform.scale;
    const adjustedY = (e.clientY - rect.top - transform.y) / transform.scale;

    const hit = handleImageClick(adjustedX, adjustedY, rect);
    if (hit) {
      startDragging(adjustedX, adjustedY, rect);
    } else {
      clearSelection();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning) {
      updatePanning(e.clientX, e.clientY);
      return;
    }

    const adjustedX = (e.clientX - rect.left - transform.x) / transform.scale;
    const adjustedY = (e.clientY - rect.top - transform.y) / transform.scale;
    handleDrag(adjustedX, adjustedY, rect);
  };

  const handleMouseUp = () => {
    stopPanning();
    stopDragging();
  };

  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const canvasKit = getCanvasKit();
      if (!canvasKit) return;

      // 更新 canvas 尺寸
      canvasRef.current.width = width;
      canvasRef.current.height = height;

      // 调整 surface 尺寸
      resizeSurface(CANVAS_ID);

      // 重新渲染画布内容
      const surface = getActiveSurface();
      if (surface) {
        const canvas = surface.getCanvas();
        // 使用 canvasKit 实例而不是类型
        canvas.clear(canvasKit.TRANSPARENT);

        // 重新绘制所有图片
        images.forEach((img) => {
          // 保存当前变换状态
          canvas.save();
          // 应用图片的变换
          canvas.translate(img.x, img.y);
          canvas.rotate(img.rotation, 0, 0);
          canvas.scale(img.scale, img.scale);
          // 绘制图片
          canvas.drawImage(img.image, 0, 0);
          // 恢复变换状态
          canvas.restore();
        });

        // 刷新画布
        surface.flush();
      }
    }
  }, [resizeSurface, getActiveSurface, images, getCanvasKit]);

  const drawImages = useCallback(() => {
    const surface = getActiveSurface();
    const canvasKit = getCanvasKit();
    if (!surface || !canvasKit) return;

    const canvas = surface.getCanvas();
    canvas.clear(canvasKit.TRANSPARENT);

    // 应用画布变换
    canvas.save();
    canvas.translate(transform.x, transform.y);
    canvas.scale(transform.scale, transform.scale);

    images.forEach((img) => {
      canvas.save();
      const paint = new canvasKit.Paint();

      // 设置透明度
      paint.setAlphaf(img.opacity || 1);

      // 设置混合模式
      if (img.blendMode) {
        const blendModeName =
          BLEND_MODES[img.blendMode as keyof typeof BLEND_MODES];
        const blendMode = canvasKit.BlendMode[
          blendModeName
        ] as EmbindEnumEntity;
        paint.setBlendMode(blendMode);
      } else {
        paint.setBlendMode(canvasKit.BlendMode.SrcOver);
      }

      // 绘制图像
      canvas.drawImage(img.image, img.x, img.y, paint);
      paint.delete();
      canvas.restore();
    });

    canvas.restore();
    surface.flush();
  }, [getActiveSurface, getCanvasKit, images, transform]);

  const handleApplyDisplacement = async (sourceId: string) => {
    if (!getCanvasKit() || !getActiveSurface()) {
      console.error("CanvasKit 或 Surface 未初始化");
      return;
    }

    const sourceImage = images.find((img) => img.id === sourceId);
    if (!sourceImage) {
      console.error("未找到源图像");
      return;
    }

    // 创建一个新的 input 元素
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const canvasKit = getCanvasKit();
        if (!canvasKit) return;
        const dispArrayBuffer = await file.arrayBuffer();
        const dispImage = canvasKit.MakeImageFromEncoded(
          new Uint8Array(dispArrayBuffer)
        );

        if (dispImage) {
          // 创建另一个 input 用于选择遮罩图片
          const maskInput = document.createElement("input");
          maskInput.type = "file";
          maskInput.accept = "image/*";
          maskInput.style.display = "none";
          document.body.appendChild(maskInput);

          maskInput.onchange = async (e) => {
            const maskFile = (e.target as HTMLInputElement).files?.[0];
            if (maskFile) {
              const maskArrayBuffer = await maskFile.arrayBuffer();
              const maskImage = canvasKit.MakeImageFromEncoded(
                new Uint8Array(maskArrayBuffer)
              );

              if (maskImage) {
                const tempSurface = canvasKit.MakeSurface(
                  sourceImage.image.width(),
                  sourceImage.image.height()
                );

                if (tempSurface) {
                  applyDisplacement(canvasKit, tempSurface, {
                    sourceImage: sourceImage.image,
                    displacementMap: dispImage,
                    maskImage: maskImage, // 添加遮罩图片
                    strength: 50,
                  });

                  const snapshot = tempSurface.makeImageSnapshot();
                  createDerivedImage(snapshot, "置换效果(带遮罩)");

                  tempSurface.delete();
                  maskImage.delete();
                }
              }
            }
            document.body.removeChild(maskInput);
          };

          maskInput.click();
        }
      } catch (error) {
        console.error("处理置换效果时出错:", error);
      }
    };

    // 将 input 添加到 document 中并触发点击
    input.style.display = "none";
    document.body.appendChild(input);

    setTimeout(() => {
      input.click();
    }, 0);
  };

  const handleBlendModeChange = (
    imageId: string,
    blendMode: keyof typeof BLEND_MODES
  ) => {
    // 如果是 'normal'，我们移除 blendMode 属性
    if (blendMode === "normal") {
      updateImageContent(imageId, { blendMode: undefined });
      return;
    }

    // 其他混合模式正常设置
    updateImageContent(imageId, { blendMode });
  };

  const handleLoadExample = async () => {
    const canvasKit = getCanvasKit();
    if (!canvasKit) {
      console.error("CanvasKit not ready");
      return;
    }

    try {
      const example = imageList.images[0];

      // 先保存到 mockupStore
      saveMockupData(example.id, {
        main: example.main,
        depth: example.depth,
        mask: example.mask,
        segment: example.segment,
        pattern: example.pattern,
        name: `示例 Mockup ${example.id}`,
      });

      // 加载主图片
      const response = await fetch(example.main);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const mainImage = canvasKit.MakeImageFromEncoded(
        new Uint8Array(arrayBuffer)
      );

      if (!mainImage) {
        throw new Error("Failed to load main image");
      }

      // 添加到画布
      addImage(mainImage, `${example.id}-main`);

      // 同时保存到 mockupStore
      await loadMockupById(example.id, canvasKit);
    } catch (error) {
      console.error("Failed to load example:", error);
    }
  };

  // 加载已存在的 mockup
  const handleLoadMockup = async (imageId: string) => {
    console.log("加载 mockup", imageId);
    const canvasKit = getCanvasKit();
    if (!canvasKit) {
      console.error("CanvasKit not ready");
      return;
    }

    try {
      await loadMockupById(imageId, canvasKit);

      if (currentMockup?.mainImage) {
        addImage(currentMockup.mainImage, imageId);
      }
    } catch (error) {
      console.error("Failed to load mockup:", error);
    }
  };

  // 初始化 CanvasKit 和 Surface
  useEffect(() => {
    if (!canvasRef.current) return;

    // 设置 canvas 初始尺寸
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;

    import("canvaskit-wasm").then(({ default: CanvasKitInit }) => {
      CanvasKitInit({
        locateFile: (file) => `/node_modules/canvaskit-wasm/bin/${file}`,
      }).then((CK) => {
        initialize(CK);
        // 确保在 canvas 准备好后再创建 surface
        if (canvasRef.current) {
          const surface = createSurface(
            CANVAS_ID,
            canvasRef.current.width,
            canvasRef.current.height
          );
          if (!surface) {
            console.error("Failed to create surface");
          }
        }
      });
    });

    return () => cleanup();
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [getCanvasKit, images]); // 依赖项包括 canvasKit 和 images

  useEffect(() => {
    drawImages();
  }, [images, drawImages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();

      // 获取鼠标在画布上的位置
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      handleWheelStore(
        e.deltaY,
        e.ctrlKey, // 检测是否按下 Ctrl 键
        clientX,
        clientY
      );
    };

    canvas.addEventListener("wheel", wheelHandler, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", wheelHandler);
    };
  }, [handleWheelStore]);

  // 添加重叠状态处理函数
  useEffect(() => {
    const handleEnterOverlap = (dragging: ImageObject, target: ImageObject) => {
      console.log("✨ 进入重叠状态:", {
        dragging: dragging.name,
        target: target.name,
        position: { x: dragging.x, y: dragging.y },
      });
      // TODO: 这里可以添加进入重叠时的业务逻辑
    };

    const handleLeaveOverlap = () => {
      console.log("🚫 离开重叠状态");
      // TODO: 这里可以添加离开重叠时的业务逻辑
    };

    useImageStore
      .getState()
      .setOverlapHandlers(handleEnterOverlap, handleLeaveOverlap);

    // 清理函数
    return () => {
      useImageStore.getState().setOverlapHandlers(
        () => {},
        () => {}
      );
    };
  }, []);

  return (
    <div className="p-8 relative flex">
      {/* 主画布区域 */}
      <div className="flex-1 relative">
        <div className="flex flex-col items-center justify-center relative z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-2xl font-bold mb-4">Skia 演示</h1>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
              onClick={handleLoadExample}
            >
              加载示例
            </button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          id={CANVAS_ID}
          style={{ width: "100%", height: "100%" }}
          className="fixed top-0 left-0"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* 图层面板 */}
      <LayerPanel
        images={images}
        selectedImage={selectedImage?.id || null}
        onSelectImage={selectImage}
        onDeleteImage={deleteImage}
        onAddImage={() => fileInputRef.current?.click()}
        onApplyDisplacement={handleApplyDisplacement}
        onBlendModeChange={(id: string, mode: string) => {
          handleBlendModeChange(
            id,
            mode as unknown as keyof typeof BLEND_MODES
          );
        }}
        onResetImage={(id: string) => {
          updateImageContent(id, {
            x: 0,
            y: 0,
          });
        }}
        onOpacityChange={(id: string, opacity: number) => {
          updateImageContent(id, { opacity });
        }}
        onCreateMockup={(imageId: string) => {
          // 当用户在图层面板中点击创建 mockup 时
          console.log("创建 mockup", imageId);
          saveMockupData(imageId, {
            main: `/mockups/${imageId}/main.jpg`, // 这里需要根据实际情况设置路径
            depth: `/mockups/${imageId}/depth.png`,
            mask: `/mockups/${imageId}/mask.png`,
            segment: `/mockups/${imageId}/segment.png`,
            name: `Mockup ${imageId}`,
          });
        }}
        onLoadMockup={handleLoadMockup}
      />

      {/* 隐藏的文件输入 */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        id="imageUpload"
        ref={fileInputRef}
        multiple
      />
    </div>
  );
}
