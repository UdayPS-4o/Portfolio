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
    desc: "eClinicalWorks ships <strong>no public API</strong>, and every request is wrapped in a <strong>custom encryption layer</strong>, so there was no sanctioned way to automate clinical intake. I sat between the client and the server, captured live traffic, and rebuilt the <strong>payload encryption</strong> and request patterns from scratch.",
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
    year: "2024 to 2025",
    role: "RPA / Anti-Queue",
    image: "/assets/project-bms.svg",
    tagline: "Beating a million-person queue.",
    desc: "Big drops like <strong>Coldplay</strong>, Travis Scott and the <strong>2023 World Cup</strong> push <strong>a million people</strong> behind Queue-IT in the same second. I built an <strong>RPA</strong> suite that drove <strong>50 isolated browser sessions</strong> in parallel, each one logging itself in, with request timing tuned to surface near the front of the queue.",
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
    desc: "A full operations suite for high-volume retail on Myntra and Flipkart. It generated accounts at scale, watched stock and prices in real time, and fired bulk checkouts the moment items dropped. The checkout executor was <strong>request-driven</strong> rather than browser-based, so it held <strong>roughly two-second COD latency</strong> even at <strong>500+ concurrency</strong>, all running serverless on <strong>GCP Cloud Run</strong>.",
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
    desc: "A real-time copy-trading engine spanning <strong>Solana and EVM chains</strong> like Ethereum and Base. It watches a set of target wallets over RPC, decodes their swap transactions the moment they land, and mirrors them across multiple copier wallets with configurable allocation, fast enough to execute <strong>within the next block</strong>.",
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
