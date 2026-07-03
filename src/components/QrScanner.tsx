'use client';

import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { X } from 'lucide-react';

/**
 * Fullscreen camera QR scanner (worker-based `qr-scanner`, uses the native
 * BarcodeDetector when available). Loaded dynamically — never in the main
 * bundle, and the camera starts only after explicit user action.
 */
export default function QrScanDialog({
  onScan,
  onClose,
}: {
  onScan: (data: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        scanner.stop();
        onScan(result.data);
      },
      { returnDetailedScanResult: true, highlightScanRegion: true },
    );
    scanner
      .start()
      .catch(() => setError('Camera unavailable — check permissions, or paste the address instead.'));
    return () => scanner.destroy();
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4">
        <p className="text-sm font-medium text-neutral-200">Scan a Bitcoin QR code</p>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="rounded-full bg-neutral-800 p-2 text-neutral-300"
        >
          <X size={18} />
        </button>
      </div>
      {error ? (
        <p className="px-6 py-10 text-center text-sm text-red-400">{error}</p>
      ) : (
        <video ref={videoRef} className="mx-auto max-h-[70vh] w-full max-w-lg rounded-2xl object-cover" />
      )}
    </div>
  );
}
