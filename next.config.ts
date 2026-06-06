import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    scrollRestoration: false,
  },

  async headers() {
    return [
      {
        // Allow /demo to be embedded in an iframe.
        // frame-ancestors * permits any origin — tighten to your portfolio domain
        // once it's known, e.g.:
        //   frame-ancestors 'self' https://swapnilbhattacharya.vercel.app;
        // Do NOT add X-Frame-Options here; it conflicts with frame-ancestors
        // and some browsers would block the frame.
        source: "/demo",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
