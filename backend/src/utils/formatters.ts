export const toAuditTarget = (type: string, id: string | number) => `${type}#${id}`;

/** 将消息模板中的 {{key}} 占位符替换为参数值 */
export const renderTemplate = (template: string, params: Record<string, string | number>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(params[key] ?? ""));

/** 取 ISO 日期串对应的 UTC 日历日，用于“同日”判断 */
export const toUtcDay = (isoDate: string): string => new Date(isoDate).toISOString().slice(0, 10);

/** 两个 ISO 日期之间相隔的 UTC 天数（绝对值） */
export const daysBetween = (isoDateA: string, isoDateB: string): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayA = Date.UTC(...(toUtcDay(isoDateA).split("-").map(Number) as [number, number, number]));
  const dayB = Date.UTC(...(toUtcDay(isoDateB).split("-").map(Number) as [number, number, number]));
  return Math.abs(Math.round((dayB - dayA) / msPerDay));
};
