"use client";
import { useEffect, useRef } from "react";
import { mountBox, type BoxHandle } from "./engine";
import "./box3d.css";

export default function Box3D({ shade, color }: { shade: string; color: string }) {
  const host = useRef<HTMLDivElement>(null);
  const box = useRef<BoxHandle | null>(null);
  const initial = useRef({ shade, color });

  useEffect(() => {
    if (!host.current) return;
    box.current = mountBox(host.current, initial.current.shade, initial.current.color);
    return () => { box.current?.destroy(); box.current = null; };
  }, []);

  useEffect(() => {
    if (shade === initial.current.shade) return;
    initial.current = { shade, color };
    box.current?.setShade(shade, color);
  }, [shade, color]);

  return <div ref={host} className="pdp-vis" role="img" aria-label={`AyurKesha ritual box, ${shade}. Drag to turn.`} />;
}
