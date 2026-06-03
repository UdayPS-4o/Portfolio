export type Project = {
  title: string;
  client?: string;
  year: string;
  role: string;
  image?: string;
  tagline?: string;
  desc: string; // may contain <strong> highlights
  bullets?: string[];
  highlight: string;
  stack: string[];
};

/* ---------------------------------------------------------
   EDIT HERE TO ADD / CHANGE PROJECTS
   Drop screenshots into public/assets/ and set `image`.
   Leave `image` empty for a clean gradient panel.
   `desc` accepts <strong>…</strong> to highlight key terms.
   --------------------------------------------------------- */
export const PROJECTS: Project[] = [
  {
    title: "EHR Automation",
    client: "eClinicalWorks",
    year: "2025",
    role: "Reverse Engineering",
    image: "/assets/project-ehr.svg",
    tagline: "Turning a closed, UI-only EHR into a programmable API.",
    desc: "eClinicalWorks ships <strong>no public API</strong> — every request is locked behind a <strong>custom encryption layer</strong> with no docs and no shortcuts. I captured live traffic, reverse-engineered the signing flow, and rebuilt <strong>payload encryption</strong> from scratch to talk the platform's native protocol without a browser in sight.",
    bullets: [
      "Reconstructed the request signing and payload encryption flow purely from intercepted traffic.",
      "Built a clean API wrapper that speaks the platform’s native protocol, with no browser and no UI scripting.",
      "Exposed programmatic patient creation and appointment scheduling as a headless integration layer.",
    ],
    highlight: "UI-free patient creation and scheduling",
    stack: ["Payload Crypto", "Traffic Analysis", "API Wrapper", "Node.js"],
  },
  {
    title: "High-Concurrency Ticketing",
    client: "BookMyShow",
    year: "2023",
    role: "RPA / Anti-Queue",
    image: "/assets/project-bms.svg",
    tagline: "Beating a million-person queue.",
    desc: "Events like <strong>Coldplay</strong> and the <strong>Cricket World Cup</strong> drop over <strong>a million users</strong> into Queue-IT in the same second. I built an <strong>RPA</strong> fleet of <strong>50 parallel sessions</strong> — each self-logging with request timing tuned to hold a position near the very front.",
    bullets: [
      "Ran 50 concurrent Firefox sessions with isolated profiles from a single controller.",
      "Cleared email and OTP verification across every session at once with an IMAP auto-login pipeline.",
      "Built custom Queue-IT bypass logic, tuning request timing to hold sub-500 positions against 1M+ users.",
      "Tracked live queue progression and seat availability across all sessions from one central monitor.",
    ],
    highlight: "Sub-500 queue positions against 1M+ users",
    stack: ["RPA", "IMAP", "Queue-IT Bypass", "Concurrency", "Monitoring"],
  },
  {
    title: "E-commerce Automation",
    client: "Myntra · Flipkart",
    year: "2023",
    role: "Automation Suite",
    image: "/assets/project-ecom.svg",
    tagline: "An automation factory for flash-sale retail.",
    desc: "A full operations suite for high-volume retail on Myntra and Flipkart — account generation, real-time stock monitors, and bulk checkouts firing the instant items dropped. The executor was <strong>request-driven</strong>, not browser-based, holding <strong>~2s COD latency</strong> even at <strong>500+ concurrency</strong>, all serverless on <strong>GCP Cloud Run</strong>.",
    bullets: [
      "Generated 500+ accounts with a central dashboard for accounts, orders and delivery codes.",
      "Ran restock and price monitors that triggered an instant, request-driven bulk checkout near two seconds.",
      "Automated card payments with 3DS OTP capture and autofill through a companion app.",
      "Deployed on GCP Cloud Run to scale elastically with demand spikes.",
    ],
    highlight: "Roughly 2s bulk checkout at 500+ concurrency",
    stack: ["GCP Cloud Run", "Request Engine", "Dashboard", "3DS / OTP"],
  },
  {
    title: "Real-Time Copy Trading Bot",
    client: "Solana + EVM",
    year: "2024",
    role: "On-chain / Low-latency",
    image: "/assets/project-trading.svg",
    tagline: "Mirroring on-chain trades inside a single block.",
    desc: "A real-time copy-trading engine across <strong>Solana</strong> and <strong>EVM chains</strong> — Ethereum, Base, and beyond. It watches target wallets over RPC, decodes swap transactions the moment they land, and mirrors them across multiple copier wallets with per-wallet allocation, fast enough to land <strong>within the next block</strong>.",
    bullets: [
      "Monitored live on-chain activity across Solana and EVM through RPC nodes.",
      "Decoded swap input data to reconstruct each target trade’s exact intent.",
      "Mapped many wallets to many copiers with configurable per-wallet allocation.",
      "Executed inside the next block to keep slippage close to the source trade.",
    ],
    highlight: "Trade mirroring within the next block",
    stack: ["Solana", "EVM", "RPC Nodes", "Swap Decoding", "Web3"],
  },
];
