"use client";

import { useEffect, useState } from "react";

/** "Indore, India" + a live IST clock — shared across variations. */
export default function MetaRow({ className = "" }: { className?: string }) {
  const [time, setTime] = useState("—");
  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Kolkata",
      }).format(new Date()) + " IST";
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={`flex gap-6 font-display text-[.8rem] tracking-[.05em] ${className}`}>
      <span>Indore, India</span>
      <span className="text-accent">{time}</span>
    </div>
  );
}
