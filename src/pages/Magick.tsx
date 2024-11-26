import {
  Channels,
  CompositeOperator,
  EvaluateOperator,
  ImageMagick,
  initializeImageMagick,
  Percentage,
  Point,
} from "@imagemagick/magick-wasm";
import magickWasmUrl from "@imagemagick/magick-wasm/magick.wasm?url";
import { useEffect, useRef, useState } from "react";

export default function MagickPage() {
  return (
    <div style={{ display: "flex", gap: "20px", background: "gray" }}>
      {/* 保持原有的所有 JSX */}
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold" as const,
  color: "#333",
}; 