export type BatchRescheduleItem = { id: number; planned_date: string; assigned_vendor_id?: number };
export type BatchReschedulePayload = { items: BatchRescheduleItem[] };
