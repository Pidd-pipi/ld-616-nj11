export const createScheduleBoardDto = (devices: unknown, vendors: unknown, plans: unknown, conflicts: unknown) => ({
  devices,
  vendors,
  plans,
  conflicts,
  generated_at: new Date().toISOString(),
});
