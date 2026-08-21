import { fetchDocument, fetchIcon } from "./fetch.js";

const REFERENCE_ORDER = ["red", "yellow", "purple", "blue", "clear", "unknown", "green"];

async function fingerprint(bytes) {
  const sample = bytes.subarray(0, Math.min(bytes.byteLength, 4096));
  const prefix = new TextEncoder().encode(`${bytes.byteLength}\0`);
  const input = new Uint8Array(prefix.byteLength + sample.byteLength);
  input.set(prefix);
  input.set(sample, prefix.byteLength);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function findFaviconUrl(pageUrl, html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  const attributePattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

  for (const tag of links) {
    const attributes = {};
    for (const match of tag.matchAll(attributePattern)) {
      attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    const rel = (attributes.rel || "").toLowerCase().split(/\s+/);
    if (attributes.href && rel.includes("icon")) {
      return new URL(attributes.href, pageUrl).href;
    }
  }

  return new URL("favicon.ico", pageUrl).href;
}

export async function discover(url) {
  const page = await fetchDocument(url);
  const faviconUrl = findFaviconUrl(page.url, page.text);
  const urls = {};
  for (const state of REFERENCE_ORDER) {
    urls[state] = new URL(`favicon-${state}.ico`, faviconUrl).href;
  }
  return { faviconUrl, urls };
}

export async function references(page) {
  const result = [];
  for (const state of REFERENCE_ORDER) {
    const icon = await fetchIcon(page.urls[state]);
    result.push({ state, url: icon.url, fingerprint: await fingerprint(icon.bytes), bytes: icon.bytes });
  }
  return result;
}

export async function identify(page, referenceSet) {
  const icon = await fetchIcon(page.faviconUrl);
  const currentFingerprint = await fingerprint(icon.bytes);
  const match = referenceSet.find(item => item.fingerprint === currentFingerprint);
  return {
    state: match?.state || "unknown",
    matched: Boolean(match),
    iconBytes: match?.bytes || icon.bytes,
    faviconUrl: icon.url,
    fingerprint: currentFingerprint
  };
}

export function serialise(referenceSet) {
  return referenceSet.map(({ state, url, fingerprint }) => ({ state, url, fingerprint }));
}
