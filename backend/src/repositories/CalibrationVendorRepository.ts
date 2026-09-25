import { seed } from "../seed";
import type { CalibrationVendor } from "../models/CalibrationVendor";

export const calibrationVendorRepository = {
  findAll: (): readonly CalibrationVendor[] => seed.calibrationVendor,
  findById: (id: number): CalibrationVendor | undefined => seed.calibrationVendor.find((vendor) => vendor.id === id),
  save: (row: unknown) => row
};
