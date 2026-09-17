import type { Solution } from "../types";
import { actionSolutions } from "./actionSolutions";
import { currentAvailabilitySolutions } from "./currentAvailabilitySolutions";
import { solutions as knowledgeSolutions } from "./knowledgeSolutions";

/**
 * Central, auditable capability catalogue.
 * Executable public-API actions and fast-moving availability entries rank alongside
 * the verified evergreen editorial knowledge set.
 */
export const solutions: Solution[] = [
  ...actionSolutions,
  ...currentAvailabilitySolutions,
  ...knowledgeSolutions
];
