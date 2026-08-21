import { DEFAULT_CONFIG, loadConfig, saveConfig, validateConfig } from "../lib/config.js";

const $ = selector => document.querySelector(selector);
let config;

function actions() {
  const disabled = !config?.xymonUrl;
  $("#check").disabled = disabled;
  $("#refresh").disabled = disabled;
  $("#not-configured").hidden = !disabled;
}

function render(state) {
  $("#state").textContent = state.state;
  $("#checked").textContent = state.lastUpdated
    ? new Date(state.lastUpdated).toLocaleString()
    : "Never";
  $("#fav").textContent = state.faviconUrl || "Not yet determined";
  $("#defs").textContent = state.referenceMapStatus === "ready" ? "loaded" : "not loaded";
  $("#detail").textContent = state.reason;
  $("#fingerprint").textContent = state.currentFingerprint || "Not available";
  $("#fingerprints").textContent = (state.referenceMap || [])
    .map(item => `${item.state}: ${item.fingerprint}`)
    .join("\n");

  const redirected = state.state === "redirect" && Boolean(state.redirectUrl);
  $("#redirect-row").hidden = !redirected;
  $("#open-redirect").hidden = !redirected;
  $("#redirect").textContent = redirected ? state.redirectUrl : "";
  $("#open-redirect").onclick = redirected
    ? () => chrome.tabs.create({ url: state.redirectUrl })
    : null;
}

async function load() {
  config = await loadConfig();
  $("#name").value = config.displayName;
  $("#url").value = config.xymonUrl;
  $("#tray").checked = config.trayIntegration;
  $("#poll").value = config.pollIntervalMinutes;
  $("#stale").value = config.staleAfterMinutes;
  actions();
  const response = await chrome.runtime.sendMessage({ command: "get-status" });
  render(response.runtimeState);
}

$("#form").onsubmit = async event => {
  event.preventDefault();
  const updated = {
    ...DEFAULT_CONFIG,
    displayName: $("#name").value.trim(),
    xymonUrl: $("#url").value.trim(),
    trayIntegration: $("#tray").checked,
    pollIntervalMinutes: Number($("#poll").value),
    staleAfterMinutes: Number($("#stale").value)
  };
  const errors = validateConfig(updated);
  $("#errors").hidden = !errors.length;
  $("#errors").textContent = errors.join(" ");
  if (errors.length) return;
  config = updated;
  actions();
  await saveConfig(updated);
};

$("#check").onclick = () => chrome.runtime.sendMessage({ command: "check-now" });
$("#refresh").onclick = () => chrome.runtime.sendMessage({ command: "refresh-icon-definitions" });

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.runtimeState) render(changes.runtimeState.newValue);
  if (area === "local" && changes.config) {
    config = { ...DEFAULT_CONFIG, ...changes.config.newValue };
    actions();
  }
});

load();
