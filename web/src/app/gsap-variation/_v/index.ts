import type { ComponentType } from "react";
import type { ThreeMode } from "./ThreeScene";
import V01Aurora from "./V01Aurora";
import V02Kinetic from "./V02Kinetic";
import V03Magnetic from "./V03Magnetic";
import V04Marquee from "./V04Marquee";
import V05Terminal from "./V05Terminal";
import V06Clip from "./V06Clip";
import V07Tilt from "./V07Tilt";
import V08Glitch from "./V08Glitch";
import V09Orbit from "./V09Orbit";
import V10Scramble from "./V10Scramble";

export type Variation = {
  id: number;
  title: string;
  blurb: string;
  three: ThreeMode;
  Component: ComponentType;
};

export const VARIATIONS: Variation[] = [
  { id: 1, title: "Aurora", blurb: "Drifting particle field + gradient haze", three: "field", Component: V01Aurora },
  { id: 2, title: "Kinetic", blurb: "Particle globe, name explodes per-character", three: "globe", Component: V02Kinetic },
  { id: 3, title: "Magnetic", blurb: "Waving particle grid, letters dodge the cursor", three: "wave", Component: V03Magnetic },
  { id: 4, title: "Marquee", blurb: "Starfield behind an endless scrolling name", three: "field", Component: V04Marquee },
  { id: 5, title: "Terminal", blurb: "Waving grid behind a typed boot sequence", three: "wave", Component: V05Terminal },
  { id: 6, title: "Clip Reveal", blurb: "Particle globe, words wipe in", three: "globe", Component: V06Clip },
  { id: 7, title: "Tilt", blurb: "Starfield behind a parallax glass card", three: "field", Component: V07Tilt },
  { id: 8, title: "Glitch", blurb: "Particle tunnel, RGB-split name", three: "tunnel", Component: V08Glitch },
  { id: 9, title: "Orbit", blurb: "3D particle rings around the name", three: "rings", Component: V09Orbit },
  { id: 10, title: "Scramble", blurb: "Particle globe, name decodes from glyphs", three: "globe", Component: V10Scramble },
];
