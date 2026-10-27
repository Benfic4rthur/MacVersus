import type { Benchmark, Dataset, Device } from "./types";

export interface Configuration { deviceId: string; storageGb: number | null }

/** Storage choices from each machine's linked Apple specification sheet. */
export function getStorageOptions(device: Device): number[] {
  const article = device.specUrl.split("/").at(-1);
  if (device.family === "MacBook Air") return device.chip === "M5"
    ? [512, 1024, 2048, 4096] : device.chip === "M1"
      ? [128, 256, 512, 1024, 2048] : [256, 512, 1024, 2048];
  if (device.chip === "M5 Pro") return [1024, 2048, 4096];
  if (device.chip === "M5 Max") return [2048, 4096, 8192];
  if (device.chip === "M5") return [512, 1024, 2048, 4096];
  if (/^M[1-4] Max$/.test(device.chip)) return [1024, 2048, 4096, 8192];
  if (/^M[12] Pro$/.test(device.chip)) return [512, 1024, 2048, 4096, 8192];
  if (/^M[34] Pro$/.test(device.chip)) return [512, 1024, 2048, 4096];
  if (/^M[34]$/.test(device.chip)) return [512, 1024, 2048];
  if (/^M[12]$/.test(device.chip)) return [256, 512, 1024, 2048];
  if (article === "111932") return device.chip.includes("i9 2.3")
    ? [1024, 2048, 4096, 8192] : [512, 1024, 2048, 4096, 8192];
  if (article === "111941") return device.chip.includes("i9 2.3")
    ? [512, 1024, 2048, 4096] : [256, 512, 1024, 2048, 4096];
  if (article === "111339") return [512, 1024, 2048, 4096];
  if (article === "111945") return [128, 256, 512, 1024, 2048];
  if (article === "111997" || article === "111981") return [256, 512, 1024, 2048];
  return device.storageGb === null ? [] : [device.storageGb];
}

export function storageLabel(value: number | null): string {
  return value === null ? "SSD não informado" : value >= 1024 ? `${value / 1024} TB` : `${value} GB`;
}

export function configurationDevice(data: Dataset, configuration: Configuration): Device | undefined {
  const device = data.devices.find(item => item.id === configuration.deviceId);
  return device ? { ...device, storageGb: configuration.storageGb } : undefined;
}

export function recordForConfiguration(data: Dataset, configuration: Configuration, workloadId: string): Benchmark | undefined {
  const original = data.devices.find(item => item.id === configuration.deviceId);
  // Unknown SSD is not interchangeable with a known one. A change in storage must
  // never inherit an SSD or application result from the original test machine.
  if (!original) return undefined;
  const exactIds = new Set(data.devices.filter(candidate => candidate.family === original.family
    && candidate.year === original.year && candidate.screenInches === original.screenInches
    && candidate.chip === original.chip && candidate.cpuCores === original.cpuCores
    && candidate.gpuCores === original.gpuCores && candidate.gpuName === original.gpuName
    && candidate.gpuMemoryGb === original.gpuMemoryGb && candidate.memoryGb === original.memoryGb
    && candidate.storageGb === configuration.storageGb).map(candidate => candidate.id));
  return data.benchmarks.find(item => exactIds.has(item.deviceId) && item.workloadId === workloadId);
}

export function parseStorageSelection(value: string | null, device: Device): number | null {
  if (value === "unknown") return null;
  if (value === null) return device.storageGb;
  const parsed = Number(value);
  return getStorageOptions(device).includes(parsed) ? parsed : device.storageGb;
}

/** Export only records applicable to each selected SSD, including same-model pairs. */
export function datasetForSelections(data: Dataset, selections: Configuration[]): Dataset {
  const devices: Device[] = [];
  const benchmarks: Benchmark[] = [];
  for (const [index, selection] of selections.entries()) {
    const device = configurationDevice(data, selection);
    if (!device) continue;
    const id = `${device.id}-selection-${index}`;
    devices.push({ ...device, id });
    for (const workload of data.workloads) {
      const record = recordForConfiguration(data, selection, workload.id);
      if (record) benchmarks.push({ ...record, id: `${record.id}-selection-${index}`, deviceId: id });
    }
  }
  return { ...data, devices, benchmarks };
}

export interface ProfileAxis {
  id: string; label: string; unit: string; left: number | null; right: number | null;
  leftRatio: number | null; rightRatio: number | null;
}

export function buildCapacityProfile(left: Device, right: Device): ProfileAxis[] {
  const raw = [
    { id: "cpu", label: "CPU", unit: "núcleos", left: left.cpuCores, right: right.cpuCores },
    { id: "gpu", label: "GPU", unit: "núcleos Apple", left: left.architecture === "intel" ? null : left.gpuCores, right: right.architecture === "intel" ? null : right.gpuCores },
    { id: "ram", label: "RAM", unit: "GB", left: left.memoryGb, right: right.memoryGb },
    { id: "ssd", label: "SSD", unit: "GB", left: left.storageGb, right: right.storageGb },
    { id: "bandwidth", label: "Banda da RAM", unit: "GB/s", left: left.bandwidthGbps, right: right.bandwidthGbps },
  ];
  return raw.map(axis => {
    const maximum = Math.max(axis.left ?? 0, axis.right ?? 0);
    const ratio = (value: number | null) => value === null || !Number.isFinite(value) || value <= 0 || maximum <= 0 ? null : value / maximum;
    return { ...axis, leftRatio: ratio(axis.left), rightRatio: ratio(axis.right) };
  });
}
