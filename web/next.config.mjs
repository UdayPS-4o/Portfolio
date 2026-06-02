/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  // Pin the tracing root to this app (a stray lockfile elsewhere otherwise
  // makes Next infer the wrong workspace root).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
