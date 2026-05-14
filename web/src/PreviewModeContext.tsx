import { createContext, useContext } from "react";

export type PreviewMode = "light" | "dark";

export const PreviewModeContext = createContext<PreviewMode>("light");

export function usePreviewMode(): PreviewMode {
  return useContext(PreviewModeContext);
}
