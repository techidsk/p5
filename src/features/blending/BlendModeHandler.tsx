import { BLEND_MODES } from "./constants";
import { useImageStore } from "../../store/imageStore";

interface BlendModeHandlerProps {
  imageId: string;
  currentMode?: keyof typeof BLEND_MODES;
  onChange: (mode: keyof typeof BLEND_MODES) => void;
}

export function BlendModeHandler({
  imageId,
  currentMode = "normal",
  onChange,
}: BlendModeHandlerProps) {
  const { updateImageContent } = useImageStore();

  const handleBlendModeChange = (mode: keyof typeof BLEND_MODES) => {
    if (mode === "normal") {
      updateImageContent(imageId, { blendMode: undefined });
    } else {
      updateImageContent(imageId, { blendMode: mode });
    }
    onChange(mode);
  };

  return (
    <select
      value={currentMode}
      onChange={(e) => handleBlendModeChange(e.target.value as keyof typeof BLEND_MODES)}
      className="text-sm border rounded px-1"
    >
      {Object.keys(BLEND_MODES).map((mode) => (
        <option key={mode} value={mode}>
          {mode}
        </option>
      ))}
    </select>
  );
} 