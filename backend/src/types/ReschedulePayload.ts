export interface ReschedulePayload {
  planned_date?: string;
  assigned_vendor_id?: number;
}

export interface BatchReschedulePayload {
  items: Array<{ id: number } & ReschedulePayload>;
}
