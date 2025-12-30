import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UIMode = "classic" | "console";

interface UIModeState {
  uiMode: UIMode;
  setUIMode: (mode: UIMode) => void;
}

export const useUIModeStore = create<UIModeState>()(
  persist(
    (set) => ({
      uiMode: "classic",
      setUIMode: (uiMode) => set({ uiMode }),
    }),
    {
      name: "ui-mode-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
