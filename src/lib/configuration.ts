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

export function getDefaultStorage(device: Device): number | null {
  const options = getStorageOptions(device);
  return options.length > 0 ? Math.min(...options) : device.storageGb;
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
  if (!original) return undefined;
  const matchingDevices = new Map(data.devices.filter(candidate => candidate.family === original.family
    && candidate.year === original.year && candidate.screenInches === original.screenInches
    && (candidate.architecture ?? "apple-silicon") === (original.architecture ?? "apple-silicon")
    && candidate.chip === original.chip && candidate.cpuCores === original.cpuCores
    && candidate.gpuCores === original.gpuCores && candidate.gpuName === original.gpuName
    && candidate.gpuMemoryGb === original.gpuMemoryGb && candidate.memoryGb === original.memoryGb)
    .map(candidate => [candidate.id, candidate]));
  const records = data.benchmarks.filter(item => matchingDevices.has(item.deviceId) && item.workloadId === workloadId);
  const exact = records.find(item => matchingDevices.get(item.deviceId)!.storageGb === configuration.storageGb);
  if (exact) return exact;

  // Throughput may be shown as a reference for identical compute hardware. This
  // does not claim that a different or unknown SSD was tested, or predict its result.
  const workload = data.workloads.find(item => item.id === workloadId);
  const permitsReference = workload && ((workload.category === "games" && workload.metric === "fps")
    || (workload.category === "llms" && workload.metric === "tokens/s"));
  if (!permitsReference) return undefined;
  const reference = records.find(item => item.deviceId === original.id) ?? records[0];
  if (!reference) return undefined;
  return { ...reference, storageReference: {
    testedStorageGb: matchingDevices.get(reference.deviceId)!.storageGb,
    selectedStorageGb: configuration.storageGb,
  } };
}

export function parseStorageSelection(value: string | null, device: Device): number | null {
  if (value === null || !/^\d+$/u.test(value)) return getDefaultStorage(device);
  const parsed = Number(value);
  return getStorageOptions(device).includes(parsed) ? parsed : getDefaultStorage(device);
}

/** Export selected records with any SSD reference metadata, including same-model pairs. */
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
