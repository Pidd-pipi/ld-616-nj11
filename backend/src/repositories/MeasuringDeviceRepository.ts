import { seed } from "../seed";
import type { MeasuringDevice } from "../models/MeasuringDevice";

const devices: readonly MeasuringDevice[] = seed.measuringDevice.map((device) => ({
  ...device,
  calibration_cycle_days: Number(device.calibration_cycle_days)
}));

export const measuringDeviceRepository = {
  findAll: (): readonly MeasuringDevice[] => devices,
  findById: (id: number): MeasuringDevice | undefined => devices.find((device) => device.id === id),
  save: (row: unknown) => row
};
