export const DEFAULT_CONFIG = Object.freeze({
  xymonUrl: "",
  pollIntervalMinutes: 5,
  staleAfterMinutes: 5,
  displayName: "Xymon",
  trayIntegration: false
});

export async function loadConfig() {
  const { config } = await chrome.storage.local.get("config");
  return { ...DEFAULT_CONFIG, ...(config || {}) };
}

export async function saveConfig(config) {
  await chrome.storage.local.set({
    config: { ...DEFAULT_CONFIG, ...config }
  });
}

export function validateConfig(config) {
  const errors = [];

  if (config.xymonUrl) {
    try {
      const parsed = new URL(config.xymonUrl);
      if (!/^[a-z][a-z0-9+.-]*:$/i.test(parsed.protocol)) {
        errors.push("The URL scheme is invalid.");
      }
    } catch {
      errors.push("The Xymon URL is not syntactically valid.");
    }
  }

  if (!Number.isInteger(config.pollIntervalMinutes) || config.pollIntervalMinutes < 1) {
    errors.push("The polling interval must be a whole number of minutes, with a minimum of 1.");
  }

  if (!Number.isInteger(config.staleAfterMinutes) || config.staleAfterMinutes < 1) {
    errors.push("The stale timeout must be a whole number of minutes, with a minimum of 1.");
  }

  if (!config.displayName.trim()) {
    errors.push("The display name must not be empty.");
  }

  return errors;
}
