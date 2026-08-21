const LOCAL_COLOURS = { redirect: "#f18a2b", error: "#d93a43" };

function localIcon(size, state) {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d");
  const midpoint = size / 2;
  context.beginPath();
  context.arc(midpoint, midpoint, size * 0.39, 0, Math.PI * 2);
  context.fillStyle = LOCAL_COLOURS[state] || "#777";
  context.fill();
  context.stroke();
  context.fillStyle = state === "redirect" ? "#222" : "#fff";
  context.font = `bold ${Math.floor(size * 0.6)}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(state === "redirect" ? "→" : "!", midpoint, midpoint);
  return context.getImageData(0, 0, size, size);
}

async function decodeIcon(bytes, size) {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/x-icon" }), {
    resizeWidth: size,
    resizeHeight: size,
    resizeQuality: "high"
  });
  try {
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, size, size);
    return context.getImageData(0, 0, size, size);
  } finally {
    bitmap.close();
  }
}

export async function setToolbar(name, state, { bytes = null, redirectUrl = "" } = {}) {
  if (state === "unknown" && !bytes) {
    await chrome.action.setIcon({
      path: { 16: "icons/xymon-unknown-16.png", 32: "icons/xymon-unknown-32.png" }
    });
  } else {
    let imageData;
    if (bytes) {
      try {
        imageData = { 16: await decodeIcon(bytes, 16), 32: await decodeIcon(bytes, 32) };
      } catch (error) {
        console.warn("Favicon decoding failed", error);
      }
    }
    imageData ||= { 16: localIcon(16, state), 32: localIcon(32, state) };
    await chrome.action.setIcon({ imageData });
  }

  const status = state === "redirect" && redirectUrl ? `redirected to ${redirectUrl}` : state;
  await chrome.action.setTitle({ title: `${name || "Xymon"}: ${status}` });
}
