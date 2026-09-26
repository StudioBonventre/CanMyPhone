import { validateStoredAutomation, type StoredAutomation } from "./materialization";
import { automationDisplayName } from "./displayName";

export type KeyValueStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
export type AutomationMirror = { save(item:StoredAutomation):Promise<void>; remove(id:string):Promise<void> };
export const AUTOMATIONS_KEY = "canmyphone.automations.v1";
export const PENDING_SETUP_KEY = "canmyphone.pendingSetup.v1";

export class AutomationPersistence {
  constructor(private readonly storage: KeyValueStorage, private readonly mirror?:AutomationMirror) {}
  async list(): Promise<StoredAutomation[]> {
    try {
      const raw=await this.storage.getItem(AUTOMATIONS_KEY);
      const parsed:unknown=raw?JSON.parse(raw):[];
      if(!Array.isArray(parsed))return [];
      const valid=parsed.filter(validateStoredAutomation);
      const normalized=valid.map((item)=>{
        const name=automationDisplayName(item.definition);
        return item.name===name?item:{...item,name};
      });
      if(normalized.some((item,index)=>item.name!==valid[index]?.name)){
        await this.storage.setItem(AUTOMATIONS_KEY,JSON.stringify(normalized));
      }
      return normalized;
    } catch { return []; }
  }
  async get(id:string){return(await this.list()).find(item=>item.id===id)??null;}
  async save(item:StoredAutomation){if(!validateStoredAutomation(item))throw new Error("INVALID_STORED_AUTOMATION");const saved={...item,updatedAt:new Date().toISOString()};const next=[...(await this.list()).filter(x=>x.id!==item.id),saved];await this.storage.setItem(AUTOMATIONS_KEY,JSON.stringify(next));await this.mirror?.save(saved);return saved;}
  async remove(id:string){const next=(await this.list()).filter(x=>x.id!==id);await this.storage.setItem(AUTOMATIONS_KEY,JSON.stringify(next));await this.mirror?.remove(id);}
  async setPendingSetup(id:string|null){if(id)await this.storage.setItem(PENDING_SETUP_KEY,id);else await this.storage.removeItem(PENDING_SETUP_KEY);}
  async getPendingSetup(){return this.storage.getItem(PENDING_SETUP_KEY);}
  async mergeRunnerSnapshots(snapshots:unknown):Promise<StoredAutomation[]> {
    if(!Array.isArray(snapshots))return this.list();
    const byId=new Map(snapshots.filter(validateStoredAutomation).map(item=>[item.id,item]));
    const next=(await this.list()).map(local=>{const native=byId.get(local.id);if(!native)return local;return {...local,lastRunAt:native.lastRunAt,lastRunStatus:native.lastRunStatus,lastErrorCode:native.lastErrorCode,lastErrorMessage:native.lastErrorMessage,executionCount:Math.max(local.executionCount,native.executionCount)};});
    await this.storage.setItem(AUTOMATIONS_KEY,JSON.stringify(next));return next;
  }
}
