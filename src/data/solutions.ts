import type { Solution } from "../types";
import { actionSolutions } from "./actionSolutions";
import { deviceSolutions } from "./deviceSolutions";
import { everydaySolutions } from "./everydaySolutions";
import { solutions as knowledgeSolutions } from "./knowledgeSolutions";
import { safetySolutions } from "./safetySolutions";

/**
 * Central, auditable capability catalogue.
 * Executable public-API actions rank alongside the verified editorial knowledge set.
 */
export const solutions: Solution[] = [
  ...actionSolutions,
  ...knowledgeSolutions,
  ...deviceSolutions,
  ...safetySolutions,
  ...everydaySolutions
];
