export const DEFAULT_RUNTIME_STATE = Object.freeze({
  state: "unknown",
  reason: "not-configured",
  redirectUrl: "",
  faviconUrl: "",
  currentFingerprint: "",
  lastUpdated: null,
  referenceMapStatus: "not-built",
  referenceMap: []
});

export async function loadRuntimeState() {
  const { runtimeState } = await chrome.storage.local.get("runtimeState");
  return { ...DEFAULT_RUNTIME_STATE, ...(runtimeState || {}) };
}

export async function saveRuntimeState(runtimeState) {
  await chrome.storage.local.set({ runtimeState });
}
