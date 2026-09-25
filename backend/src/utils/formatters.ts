export const toAuditTarget = (type: string, id: string | number) => `${type}#${id}`;
export const toUtcDay = (value: string | Date) => new Date(value).toISOString().slice(0, 10);
