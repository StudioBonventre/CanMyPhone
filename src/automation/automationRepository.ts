import AsyncStorage from "@react-native-async-storage/async-storage";
import { CanMyPhoneNative } from "../../modules/canmyphone-native";
import { AutomationPersistence } from "./automationPersistence";

export const automationRepository = new AutomationPersistence(AsyncStorage, {
  async save(item){await CanMyPhoneNative?.syncAutomationDefinition(JSON.stringify(item));},
  async remove(id){await CanMyPhoneNative?.deleteAutomationDefinition(id);}
});
