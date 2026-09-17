import type { Solution } from "../types";
import { actionSolutions } from "./actionSolutions";
import { solutions as knowledgeSolutions } from "./knowledgeSolutions";

/**
 * Central, auditable capability catalogue.
 * Executable public-API actions rank alongside the verified editorial knowledge set.
 */
export const solutions: Solution[] = [...actionSolutions, ...knowledgeSolutions];
