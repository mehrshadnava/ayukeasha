"use client";

export default function PrintButton() {
  return <button className="btn btn-gold btn-sm" onClick={() => window.print()}>Print / save as PDF</button>;
}
