import type { Benchmark, Dataset, Device } from "./types";

export interface Configuration { deviceId: string; storageGb: number | null }
export interface ConfigurationRecordOptions { includeRelated?: boolean }

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

export function recordForConfiguration(
  data: Dataset, configuration: Configuration, workloadId: string, options: ConfigurationRecordOptions = {},
): Benchmark | undefined {
  const original = data.devices.find(item => item.id === configuration.deviceId);
  if (!original) return undefined;
  const workload = data.workloads.find(item => item.id === workloadId);
  const permitsReference = Boolean(workload && ((workload.category === "games" && workload.metric === "fps")
    || (workload.category === "llms" && workload.metric === "tokens/s")));
  const matchingDevices = new Map(data.devices.filter(candidate => candidate.family === original.family
    && candidate.year === original.year
    && (candidate.architecture ?? "apple-silicon") === (original.architecture ?? "apple-silicon")
    && candidate.chip === original.chip && candidate.cpuCores === original.cpuCores
    && candidate.gpuCores === original.gpuCores && candidate.gpuName === original.gpuName
    && candidate.gpuMemoryGb === original.gpuMemoryGb)
    .map(candidate => [candidate.id, candidate]));
  const candidates = data.benchmarks.flatMap(record => {
    const testedDevice = matchingDevices.get(record.deviceId);
    if (!testedDevice || record.workloadId !== workloadId) return [];
    const testedStorageGb = record.testedStorageGb === undefined ? testedDevice.storageGb : record.testedStorageGb;
    const testedScreenInches = record.testedScreenInches === undefined ? testedDevice.screenInches : record.testedScreenInches;
    const sameMemory = testedDevice.memoryGb === original.memoryGb;
    const sameScreen = testedScreenInches === original.screenInches;
    const sameStorage = testedStorageGb === configuration.storageGb;
    if ((!sameMemory || !sameScreen) && !(permitsReference && options.includeRelated)) return [];
    if (!sameStorage && !permitsReference) return [];
    return [{ record, testedDevice, testedStorageGb, testedScreenInches, sameMemory, sameScreen, sameStorage }];
  });
  // Exact RAM comes first, then the measured screen, SSD and selected catalog ID.
  candidates.sort((a, b) => Number(b.sameMemory) - Number(a.sameMemory)
    || Number(b.sameScreen) - Number(a.sameScreen) || Number(b.sameStorage) - Number(a.sameStorage)
    || Number(b.record.deviceId === original.id) - Number(a.record.deviceId === original.id));
  const best = candidates[0];
  if (!best) return undefined;
  if (best.sameMemory && best.sameScreen && best.sameStorage) return best.record;

  const reference: Benchmark = { ...best.record };
  if (!best.sameMemory || !best.sameScreen) {
    reference.hardwareReference = {
      testedMemoryGb: best.testedDevice.memoryGb, selectedMemoryGb: original.memoryGb,
      testedScreenInches: best.testedScreenInches, selectedScreenInches: original.screenInches,
      differences: [...(best.sameMemory ? [] : ["memory" as const]), ...(best.sameScreen ? [] : ["screen" as const])],
    };
  }
  if (!best.sameStorage) reference.storageReference = {
    testedStorageGb: best.testedStorageGb, selectedStorageGb: configuration.storageGb,
  };
  return reference;
}

export function parseStorageSelection(value: string | null, device: Device): number | null {
  if (value === null || !/^\d+$/u.test(value)) return getDefaultStorage(device);
  const parsed = Number(value);
  return getStorageOptions(device).includes(parsed) ? parsed : getDefaultStorage(device);
}

/** Export selected records with any SSD reference metadata, including same-model pairs. */
export function datasetForSelections(data: Dataset, selections: Configuration[], options: ConfigurationRecordOptions = {}): Dataset {
  const devices: Device[] = [];
  const benchmarks: Benchmark[] = [];
  for (const [index, selection] of selections.entries()) {
    const device = configurationDevice(data, selection);
    if (!device) continue;
    const id = `${device.id}-selection-${index}`;
    devices.push({ ...device, id });
    for (const workload of data.workloads) {
      const record = recordForConfiguration(data, selection, workload.id, options);
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
