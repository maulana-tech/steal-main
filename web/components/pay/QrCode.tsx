"use client";

import { useEffect, useRef, useState } from "react";
import encodeQR from "@paulmillr/qr";

/**
 * Renders a payment link as a scannable QR code (SVG) with a PNG download.
 * Pure client-side — the link (including its secret fragment) never leaves the
 * device.
 */
export default function QrCode({
  value,
  size = 220,
  downloadName = "eclipse-payment.png",
}: {
  value: string;
  size?: number;
  downloadName?: string;
}) {
  const [svg, setSvg] = useState<string>("");
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Higher ECC + a quiet border keeps it scannable even when printed small.
      setSvg(encodeQR(value, "svg", { ecc: "medium", border: 2 }));
    } catch {
      setSvg("");
    }
  }, [value]);

  function download() {
    if (!svg) return;
    const scale = 4;
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size * scale;
      canvas.height = size * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = downloadName;
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={holderRef}
        className="rounded-2xl bg-white p-3 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        style={{ width: size, height: size }}
        // The SVG is generated locally from `value`; no external/user HTML.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <button
        type="button"
        onClick={download}
        disabled={!svg}
        className="liquid-glass rounded-full px-4 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/5 disabled:opacity-50"
      >
        Download PNG
      </button>
    </div>
  );
}
