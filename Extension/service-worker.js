import { loadConfig } from "./lib/config.js";
import { DEFAULT_RUNTIME_STATE, loadRuntimeState, saveRuntimeState } from "./lib/state.js";
import { ExternalRedirectError } from "./lib/fetch.js";
import { discover, references, identify, serialise } from "./lib/favicon.js";
import { setToolbar } from "./lib/toolbar.js";

const ALARM = "xymon-poll";
const NATIVE_HOST = "com.xymon.tray";
let busy = false;
let page = null;
let refs = null;
let cacheUrl = "";
let nativePort = null;

function connectNativeHost() {
  if (nativePort) return nativePort;
  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST);
    nativePort.onDisconnect.addListener(() => {
      const message = chrome.runtime.lastError?.message;
      if (message) console.warn("XymonTray native host disconnected:", message);
      nativePort = null;
    });
  } catch (error) {
    console.warn("XymonTray native host is unavailable:", error);
    nativePort = null;
  }
  return nativePort;
}

function buildTrayMessage(config, runtimeState, iconBytes = null) {
  const message = {
    state: runtimeState.state || "unknown",
    displayName: config.displayName || "Xymon",
    staleAfter: Number.isFinite(config.staleAfterMinutes) ? config.staleAfterMinutes * 60 : 300
  };
  if (config.xymonUrl) message.url = config.xymonUrl;

  if (iconBytes?.byteLength) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < iconBytes.byteLength; offset += chunkSize) {
      binary += String.fromCharCode(...iconBytes.subarray(offset, offset + chunkSize));
    }
    message.iconData = btoa(binary);
  }
  return message;
}

function publishToNativeHost(config, runtimeState, iconBytes = null) {
  if (!config.trayIntegration) return;
  const port = connectNativeHost();
  if (!port) return;
  try {
    port.postMessage(buildTrayMessage(config, runtimeState, iconBytes));
  } catch (error) {
    console.warn("Could not publish XymonTray status to native host:", error);
    nativePort = null;
  }
}

async function setAlarm() {
  const config = await loadConfig();
  await chrome.alarms.clear(ALARM);
  if (config.xymonUrl) {
    await chrome.alarms.create(ALARM, {
      delayInMinutes: config.pollIntervalMinutes,
      periodInMinutes: config.pollIntervalMinutes
    });
  }
}

async function publish(config, runtimeState, iconBytes = null) {
  await saveRuntimeState(runtimeState);
  await setToolbar(config.displayName, runtimeState.state, {
    bytes: iconBytes,
    redirectUrl: runtimeState.redirectUrl
  });
  publishToNativeHost(config, runtimeState, iconBytes);
}

async function reset(config, reason) {
  page = null;
  refs = null;
  cacheUrl = config.xymonUrl;
  const runtimeState = { ...DEFAULT_RUNTIME_STATE, reason };
  await publish(config, runtimeState);
  return runtimeState;
}

async function poll(force = false) {
  if (busy) return { ok: false, error: "A check is already in progress." };
  busy = true;
  const config = await loadConfig();
  try {
    if (!config.xymonUrl) {
      return { ok: true, runtimeState: await reset(config, "not-configured") };
    }
    if (cacheUrl !== config.xymonUrl) await reset(config, "awaiting-first-check");
    page = await discover(config.xymonUrl);
    if (force || !refs) {
      page = await discover(config.xymonUrl);
      refs = await references(page);
    }
    let result = await identify(page, refs);
    if (!result.matched) {
      page = await discover(config.xymonUrl);
      refs = await references(page);
      result = await identify(page, refs);
    }
    const runtimeState = {
      ...DEFAULT_RUNTIME_STATE,
      state: result.state,
      reason: result.matched ? "matched-favicon" : "unrecognised-favicon",
      faviconUrl: result.faviconUrl,
      currentFingerprint: result.fingerprint,
      lastUpdated: new Date().toISOString(),
      referenceMapStatus: "ready",
      referenceMap: serialise(refs)
    };
    await publish(config, runtimeState, result.iconBytes);
    return { ok: true, runtimeState };
  } catch (error) {
    const redirected = error instanceof ExternalRedirectError || error?.name === "ExternalRedirectError";
    const runtimeState = {
      ...DEFAULT_RUNTIME_STATE,
      state: redirected ? "redirect" : "error",
      reason: redirected ? "redirected-away-from-origin" : error.message,
      redirectUrl: redirected ? error.targetUrl : "",
      lastUpdated: new Date().toISOString()
    };
    await publish(config, runtimeState);
    return { ok: false, error: runtimeState.reason, runtimeState };
  } finally {
    busy = false;
  }
}

async function initialise() {
  const config = await loadConfig();
  cacheUrl = config.xymonUrl;
  if (config.trayIntegration) connectNativeHost();
  await setAlarm();
  await reset(config, config.xymonUrl ? "awaiting-first-check" : "not-configured");
  if (config.xymonUrl) await poll();
}

chrome.runtime.onInstalled.addListener(() => initialise());
chrome.runtime.onStartup.addListener(() => initialise());
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === ALARM) poll(); });
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes.config) return;
  const oldUrl = changes.config.oldValue?.xymonUrl || "";
  const newUrl = changes.config.newValue?.xymonUrl || "";
  const config = await loadConfig();
  if (!config.trayIntegration && nativePort) {
    nativePort.disconnect();
    nativePort = null;
  }
  if (oldUrl !== newUrl) {
    await reset(config, newUrl ? "awaiting-first-check" : "not-configured");
  }
  await setAlarm();
  if (config.xymonUrl) await poll();
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.command === "check-now") { poll().then(sendResponse); return true; }
  if (message?.command === "refresh-icon-definitions") { poll(true).then(sendResponse); return true; }
  if (message?.command === "get-status") {
    Promise.all([loadConfig(), loadRuntimeState()]).then(([config, runtimeState]) =>
      sendResponse({ ok: true, config, runtimeState })
    );
    return true;
  }
  return false;
});

initialise();
