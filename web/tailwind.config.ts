import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070709",
        "bg-soft": "#0e0e12",
        surface: "#131318",
        line: "rgba(255,255,255,0.10)",
        text: "#ededf0",
        muted: "#8a8a93",
        faint: "#54545c",
        accent: "#ccff3d",
        accent2: "#7c5cff",
        accent3: "#ff5c7c",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        ease: "cubic-bezier(.22,1,.36,1)",
      },
      keyframes: {
        grain: {
          "0%,100%": { transform: "translate(0,0)" },
          "10%": { transform: "translate(-5%,-5%)" },
          "30%": { transform: "translate(3%,-8%)" },
          "50%": { transform: "translate(-4%,6%)" },
          "70%": { transform: "translate(6%,4%)" },
          "90%": { transform: "translate(-6%,2%)" },
        },
        blink: { "50%": { opacity: "0" } },
        pulse2: {
          "0%": { boxShadow: "0 0 0 0 rgba(204,255,61,.6)" },
          "70%": { boxShadow: "0 0 0 9px rgba(204,255,61,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(204,255,61,0)" },
        },
        scrolldn: { "0%": { top: "-50%" }, "100%": { top: "100%" } },
      },
      animation: {
        grain: "grain 8s steps(6) infinite",
        blink: "blink 1.1s steps(1) infinite",
        pulse2: "pulse2 2s infinite",
        scrolldn: "scrolldn 2s cubic-bezier(.22,1,.36,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
