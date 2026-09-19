import { validateStoredAutomation, type StoredAutomation } from "./materialization";

export type KeyValueStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
export type AutomationMirror = { save(item:StoredAutomation):Promise<void>; remove(id:string):Promise<void> };
export const AUTOMATIONS_KEY = "canmyphone.automations.v1";
export const PENDING_SETUP_KEY = "canmyphone.pendingSetup.v1";

export class AutomationPersistence {
  constructor(private readonly storage: KeyValueStorage, private readonly mirror?:AutomationMirror) {}
  async list(): Promise<StoredAutomation[]> { try { const raw=await this.storage.getItem(AUTOMATIONS_KEY);const parsed:unknown=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed.filter(validateStoredAutomation):[]; } catch { return []; } }
  async get(id:string){return(await this.list()).find(item=>item.id===id)??null;}
  async save(item:StoredAutomation){if(!validateStoredAutomation(item))throw new Error("INVALID_STORED_AUTOMATION");const saved={...item,updatedAt:new Date().toISOString()};const next=[...(await this.list()).filter(x=>x.id!==item.id),saved];await this.storage.setItem(AUTOMATIONS_KEY,JSON.stringify(next));await this.mirror?.save(saved);return saved;}
  async remove(id:string){const next=(await this.list()).filter(x=>x.id!==id);await this.storage.setItem(AUTOMATIONS_KEY,JSON.stringify(next));await this.mirror?.remove(id);}
  async setPendingSetup(id:string|null){if(id)await this.storage.setItem(PENDING_SETUP_KEY,id);else await this.storage.removeItem(PENDING_SETUP_KEY);}
  async getPendingSetup(){return this.storage.getItem(PENDING_SETUP_KEY);}
}
