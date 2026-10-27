import test from "node:test";
import assert from "node:assert/strict";
import { dataset } from "../src/data/catalog";
import { buildCapacityProfile, getStorageOptions, parseStorageSelection, recordForConfiguration } from "../src/lib/configuration";

test("changing SSD never borrows measurements from the original test machine", () => {
  const deviceId = "mbp16-m1max-64";
  assert.ok(recordForConfiguration(dataset, { deviceId, storageGb: 2048 }, "shadow-1080-high"));
  assert.equal(recordForConfiguration(dataset, { deviceId, storageGb: 1024 }, "shadow-1080-high"), undefined);
  assert.equal(recordForConfiguration(dataset, { deviceId, storageGb: null }, "shadow-1080-high"), undefined);
});

test("unknown SSD remains unknown and never matches a chosen capacity", () => {
  const deviceId = "mba13-m1-16";
  assert.ok(recordForConfiguration(dataset, { deviceId, storageGb: null }, "llama2-q4-generation"));
  assert.equal(recordForConfiguration(dataset, { deviceId, storageGb: 1024 }, "llama2-q4-generation"), undefined);
});

test("a newly sourced exact SSD configuration can supply its own measurement", () => {
  const original = dataset.devices.find(d => d.id === "mbp16-m1max-64")!;
  const record = dataset.benchmarks.find(b => b.deviceId === original.id)!;
  const extra = { ...original, id: "fixture-only-exact-ssd", storageGb: 1024 };
  const fixture = { ...dataset, devices: [...dataset.devices, extra], benchmarks: [...dataset.benchmarks, { ...record, id: "fixture-only-record", deviceId: extra.id }] };
  assert.equal(recordForConfiguration(fixture, { deviceId: original.id, storageGb: 1024 }, record.workloadId)?.id, "fixture-only-record");
  const differentRam = { ...fixture, devices: fixture.devices.map(d => d.id === extra.id ? { ...d, memoryGb: 32 } : d) };
  assert.equal(recordForConfiguration(differentRam, { deviceId: original.id, storageGb: 1024 }, record.workloadId), undefined);
});

test("storage URLs reject unsupported values without changing the configuration", () => {
  const device = dataset.devices.find(d => d.id === "mbp16-m1max-64")!;
  assert.equal(parseStorageSelection("1024", device), 1024);
  assert.equal(parseStorageSelection("1234", device), 2048);
  assert.equal(parseStorageSelection("unknown", device), null);
  assert.equal(getStorageOptions(device).includes(256), false);
});

test("radar uses actual capacities and leaves unsupported Intel GPU axis unknown", () => {
  const left = dataset.devices.find(d => d.id === "mbp16-m1pro-16")!;
  const right = dataset.devices.find(d => d.id === "mbp16-m1max-64")!;
  const profile = buildCapacityProfile(left, right);
  assert.equal(profile.find(a => a.id === "ram")!.leftRatio, .25);
  assert.equal(profile.find(a => a.id === "ram")!.rightRatio, 1);
  const intel = dataset.devices.find(d => d.architecture === "intel")!;
  const missing = buildCapacityProfile(intel, { ...right, storageGb: null });
  assert.equal(missing.find(a => a.id === "gpu")!.leftRatio, null);
  assert.equal(missing.find(a => a.id === "ssd")!.rightRatio, null);
});
