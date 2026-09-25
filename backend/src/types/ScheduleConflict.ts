export type ConflictReason = { code: string; message: string };
export type BoardConflict = { type: string; message: string; plan_ids: number[]; device_id?: number; vendor_id?: number; date?: string };
