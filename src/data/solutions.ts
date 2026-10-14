import type { Solution } from "../types";
import { actionSolutions } from "./actionSolutions";
import { automationRecipes } from "./automationRecipes";
import { deviceSolutions } from "./deviceSolutions";
import { everydaySolutions } from "./everydaySolutions";
import { solutions as knowledgeSolutions } from "./knowledgeSolutions";
import { safetySolutions } from "./safetySolutions";

/**
 * Central, auditable capability catalogue.
 * Executable public-API actions rank alongside the verified editorial knowledge set.
 */
export const solutions: Solution[] = [
  ...automationRecipes,
  ...actionSolutions,
  ...knowledgeSolutions,
  ...deviceSolutions,
  ...safetySolutions,
  ...everydaySolutions
];

/** Only the one-off how-tos („Tipps“), without automation recipes. */
export const tipSolutions: Solution[] = solutions.filter((item) => !item.automation);

/** Only the automation recipes. */
export const recipeSolutions: Solution[] = solutions.filter((item) => Boolean(item.automation));
