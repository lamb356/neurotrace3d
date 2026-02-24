import * as UTIF from "utif2";

interface LoadMessage {
  type: "load";
  buffer: ArrayBuffer;
}

interface DecodeSliceMessage {
  type: "decode-slice";
  index: number;
}

interface DecodeRangeMessage {
  type: "decode-range";
  start: number;
  end: number;
}

type WorkerMessage = LoadMessage | DecodeSliceMessage | DecodeRangeMessage;

let fileBuffer: ArrayBuffer | null = null;
let ifds: UTIF.IFD[] = [];

function getSliceDimensions(ifd: UTIF.IFD): { width: number; height: number } {
  const w = (ifd as Record<string, unknown>).t256 as number[] | undefined;
  const h = (ifd as Record<string, unknown>).t257 as number[] | undefined;
  return {
    width: w ? w[0] : 0,
    height: h ? h[0] : 0,
  };
}

function getBitDepth(ifd: UTIF.IFD): number {
  const bps = (ifd as Record<string, unknown>).t258 as number[] | undefined;
  return bps ? bps[0] : 8;
}

function decodeSliceRGBA(index: number): Uint8Array | null {
  if (!fileBuffer || index < 0 || index >= ifds.length) return null;

  const ifd = ifds[index];
  UTIF.decodeImage(fileBuffer, ifd);

  const bitDepth = getBitDepth(ifd);

  if (bitDepth > 8 && ifd.data) {
    // 16-bit: manual normalization for better dynamic range
    const raw = new Uint16Array(
      ifd.data.buffer,
      ifd.data.byteOffset,
      ifd.data.byteLength / 2,
    );
    const { width, height } = getSliceDimensions(ifd);
    const w = ifd.width || width;
    const h = ifd.height || height;

    // Find min/max for auto-contrast
    let min = 65535;
    let max = 0;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] < min) min = raw[i];
      if (raw[i] > max) max = raw[i];
    }
    const range = max - min || 1;

    // Convert to RGBA
    const samplesPerPixel = (
      (ifd as Record<string, unknown>).t277 as number[] | undefined
    )?.[0] ?? 1;
    const pixelCount = w * h;
    const rgba = new Uint8Array(pixelCount * 4);

    if (samplesPerPixel >= 3) {
      // RGB 16-bit
      for (let p = 0; p < pixelCount; p++) {
        rgba[p * 4] = ((raw[p * samplesPerPixel] - min) / range) * 255;
        rgba[p * 4 + 1] = ((raw[p * samplesPerPixel + 1] - min) / range) * 255;
        rgba[p * 4 + 2] = ((raw[p * samplesPerPixel + 2] - min) / range) * 255;
        rgba[p * 4 + 3] = 255;
      }
    } else {
      // Grayscale 16-bit
      for (let p = 0; p < pixelCount; p++) {
        const v = ((raw[p] - min) / range) * 255;
        rgba[p * 4] = v;
        rgba[p * 4 + 1] = v;
        rgba[p * 4 + 2] = v;
        rgba[p * 4 + 3] = 255;
      }
    }

    // Free decoded pixel data from IFD to save memory
    ifd.data = new Uint8Array(0);

    return rgba;
  }

  // 8-bit: use built-in RGBA conversion
  const rgba = UTIF.toRGBA8(ifd);

  // Free decoded pixel data
  ifd.data = new Uint8Array(0);

  return rgba;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === "load") {
    try {
      fileBuffer = msg.buffer;
      ifds = UTIF.decode(fileBuffer);

      if (ifds.length === 0) {
        self.postMessage({ type: "error", message: "No images found in TIFF file" });
        return;
      }

      const { width, height } = getSliceDimensions(ifds[0]);
      const bitDepth = getBitDepth(ifds[0]);
      const omeXml = (
        (ifds[0] as Record<string, unknown>).t270 as string[] | undefined
      )?.[0] ?? null;

      self.postMessage({
        type: "metadata",
        sliceCount: ifds.length,
        width: ifds[0].width || width,
        height: ifds[0].height || height,
        bitDepth,
        omeXml,
      });

      // Auto-decode first slice
      const rgba = decodeSliceRGBA(0);
      if (rgba) {
        self.postMessage(
          { type: "slice", index: 0, rgba },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [rgba.buffer] as any,
        );
      }
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
  } else if (msg.type === "decode-slice") {
    try {
      const rgba = decodeSliceRGBA(msg.index);
      if (rgba) {
        self.postMessage(
          { type: "slice", index: msg.index, rgba },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [rgba.buffer] as any,
        );
      }
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
  } else if (msg.type === "decode-range") {
    try {
      const start = Math.max(0, msg.start);
      const end = Math.min(ifds.length - 1, msg.end);
      for (let i = start; i <= end; i++) {
        const rgba = decodeSliceRGBA(i);
        if (rgba) {
          self.postMessage(
            { type: "slice", index: i, rgba },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [rgba.buffer] as any,
          );
        }
      }
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
  }
};
