import type { Solution } from "../types";
import { actionSolutions } from "./actionSolutions";
import { currentAvailabilitySolutions } from "./currentAvailabilitySolutions";
import { solutions as knowledgeSolutions } from "./knowledgeSolutions";
import { top100GuideSolutions } from "./top100Settings";

/**
 * Central, auditable capability catalogue.
 * Executable public-API actions and fast-moving availability entries rank alongside
 * the verified evergreen editorial knowledge set and the Top 100 settings collection.
 */
export const solutions: Solution[] = [
  ...actionSolutions,
  ...currentAvailabilitySolutions,
  ...knowledgeSolutions,
  ...top100GuideSolutions
];
