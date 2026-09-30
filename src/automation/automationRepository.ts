import AsyncStorage from "@react-native-async-storage/async-storage";
import { CanMyPhoneNative } from "../../modules/canmyphone-native";
import { AutomationPersistence } from "./automationPersistence";
import { syncNativeConnectorRegistry } from "../lib/connectorRegistryService";

export const automationRepository = new AutomationPersistence(AsyncStorage, {
  async save(item){
    await syncNativeConnectorRegistry();
    if (!item.enabled && item.materializationState === "DISABLED" && (item.installationPlan?.installationHost === "HOMEKIT" || item.definition.trigger.capabilityId.startsWith("trigger.homekit-"))) {
      const removed = await CanMyPhoneNative?.removeHomeKitAutomation?.(item.id);
      if (!removed?.success) throw new Error("HOMEKIT_REMOVE_FAILED");
    }
    const nativeSynced = await CanMyPhoneNative?.syncAutomationDefinition(JSON.stringify(item));
    if (nativeSynced !== true) throw new Error("NATIVE_AUTOMATION_SYNC_FAILED");
    await CanMyPhoneNative?.syncLocationAutomations?.().catch(()=>undefined);
  },
  async remove(id){
    const item = await automationRepository.get(id);
    if (item && (item.installationPlan?.installationHost === "HOMEKIT" || item.definition.trigger.capabilityId.startsWith("trigger.homekit-")) && item.materializationState === "ACTIVE") {
      const removed = await CanMyPhoneNative?.removeHomeKitAutomation?.(id);
      if (!removed?.success) throw new Error("HOMEKIT_REMOVE_FAILED");
    }
    if (!CanMyPhoneNative) throw new Error("NATIVE_AUTOMATION_SYNC_FAILED");
    await CanMyPhoneNative.deleteAutomationDefinition(id);
    await CanMyPhoneNative.syncLocationAutomations?.().catch(()=>undefined);
  }
});

export async function syncNativeRunnerResults() {
  const raw=await CanMyPhoneNative?.automationRunnerSnapshots();
  if(!raw)return automationRepository.list();
  try{return await automationRepository.mergeRunnerSnapshots(JSON.parse(raw) as unknown);}catch{return automationRepository.list();}
}
