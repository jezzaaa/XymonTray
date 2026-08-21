const $ = selector => document.querySelector(selector);
let config;

function render(state) {
  $("#state").textContent = state.state;
  $("#checked").textContent = state.lastUpdated
    ? new Date(state.lastUpdated).toLocaleString()
    : "Never";

  const redirected = state.state === "redirect" && Boolean(state.redirectUrl);
  $("#redirect-row").hidden = !redirected;
  $("#open-redirect").hidden = !redirected;
  $("#redirect").textContent = redirected ? state.redirectUrl : "";
  $("#open-redirect").onclick = redirected
    ? () => chrome.tabs.create({ url: state.redirectUrl })
    : null;
}

async function load() {
  const response = await chrome.runtime.sendMessage({ command: "get-status" });
  config = response.config;
  $("#name").textContent = config.displayName || "Xymon";
  $("#open").hidden = !config.xymonUrl;
  $("#check").disabled = !config.xymonUrl;
  $("#open").onclick = () => chrome.tabs.create({ url: config.xymonUrl });
  render(response.runtimeState);
}

$("#check").onclick = () => chrome.runtime.sendMessage({ command: "check-now" });
$("#configure").onclick = () => chrome.runtime.openOptionsPage();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.runtimeState) render(changes.runtimeState.newValue);
});
load();
