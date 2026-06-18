"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      duration={4200}
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-white/20 bg-[#1a0a3a]/95 text-white shadow-2xl backdrop-blur-xl font-semibold",
          title: "text-sm font-black text-white",
          description: "text-xs font-semibold text-white/75",
          closeButton:
            "bg-white/10 text-white border-white/20 hover:bg-white/20 [&_svg]:text-white",
          success: "!border-emerald-400/40",
          error: "!border-rose-400/40",
        },
      }}
    />
  );
}
