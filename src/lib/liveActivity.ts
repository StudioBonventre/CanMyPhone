import { GuideSession } from "../types";

export function liveActivityAvailable(): boolean {
  return false;
}

export async function startGuideLiveActivity(_session: GuideSession): Promise<boolean> {
  return false;
}

export async function updateGuideLiveActivity(_session: GuideSession): Promise<void> {
  return;
}

export async function endGuideLiveActivity(_message = "Done"): Promise<void> {
  return;
}
