export const MAX_ICON_BYTES = 65536;
export const MAX_DOCUMENT_BYTES = 1048576;

export class ExternalRedirectError extends Error {
  constructor(targetUrl) {
    super(`Request redirected outside the configured origin to ${targetUrl}`);
    this.name = "ExternalRedirectError";
    this.targetUrl = targetUrl;
  }
}

async function readBounded(response, limit) {
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) > limit) {
    throw new Error(`Response exceeded the ${limit}-byte limit.`);
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit) throw new Error(`Response exceeded the ${limit}-byte limit.`);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error(`Response exceeded the ${limit}-byte limit.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function request(url, limit) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    redirect: "follow"
  });

  const requested = new URL(url);
  const returned = new URL(response.url || url);
  if (["http:", "https:"].includes(requested.protocol) && requested.origin !== returned.origin) {
    throw new ExternalRedirectError(response.url);
  }

  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}.`);
  return { url: response.url || url, bytes: await readBounded(response, limit) };
}

export async function fetchDocument(url) {
  const result = await request(url, MAX_DOCUMENT_BYTES);
  return { url: result.url, text: new TextDecoder().decode(result.bytes) };
}

export async function fetchIcon(url) {
  return request(url, MAX_ICON_BYTES);
}
