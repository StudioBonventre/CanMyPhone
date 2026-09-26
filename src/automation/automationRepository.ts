import AsyncStorage from "@react-native-async-storage/async-storage";
import { CanMyPhoneNative } from "../../modules/canmyphone-native";
import { AutomationPersistence } from "./automationPersistence";

export const automationRepository = new AutomationPersistence(AsyncStorage, {
  async save(item){
    await CanMyPhoneNative?.syncAutomationDefinition(JSON.stringify(item));
    await CanMyPhoneNative?.syncLocationAutomations?.().catch(()=>undefined);
  },
  async remove(id){
    await CanMyPhoneNative?.deleteAutomationDefinition(id);
    await CanMyPhoneNative?.syncLocationAutomations?.().catch(()=>undefined);
  }
});

export async function syncNativeRunnerResults() {
  const raw=await CanMyPhoneNative?.automationRunnerSnapshots();
  if(!raw)return automationRepository.list();
  try{return await automationRepository.mergeRunnerSnapshots(JSON.parse(raw) as unknown);}catch{return automationRepository.list();}
}
