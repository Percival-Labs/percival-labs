import { resolve } from "path";
import { readdirSync } from "fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { terrariumPage } from "./terrarium.ts";
import { EventProxy } from "./event-proxy.ts";

const app = new Hono();

// Allow iframe embedding from website (port 3400) and other local services
app.use("*", cors());
const PORT = Number(process.env.PORT ?? 3500);
const APP_ROOT = resolve(import.meta.dirname, "..");
const AGENTS_URL = process.env.AGENTS_URL ?? "http://localhost:3200";
const AGENTS_API_KEY = process.env.AGENTS_API_KEY;

// Initialize SSE proxy to agents service
const eventProxy = new EventProxy(AGENTS_URL, AGENTS_API_KEY);

// Serve static assets (scene images, sprites, etc.)
app.use("/public/*", serveStatic({ root: APP_ROOT }));

// Main terrarium view — self-contained HTML page
app.get("/", (c) => c.html(terrariumPage()));

// SSE endpoint for browser clients — proxies events from agents service
app.get("/events", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed
        }
      }

      // Send connection status
      send(
        `data: ${JSON.stringify({
          type: "connected",
          timestamp: new Date().toISOString(),
          upstream: eventProxy.isConnected,
        })}\n\n`
      );

      // Backfill recent buffered events
      const recent = eventProxy.getRecentEvents(50);
      for (const event of recent) {
        send(`data: ${JSON.stringify(event)}\n\n`);
      }

      // Stream new events as they arrive
      const unsubscribe = eventProxy.subscribe((event) => {
        send(`data: ${JSON.stringify(event)}\n\n`);
      });

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        send(`: heartbeat\n\n`);
      }, 30_000);

      // Cleanup when browser disconnects
      const cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };

      c.req.raw.signal?.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// Connection status endpoint
app.get("/status", (c) =>
  c.json({
    service: "terrarium",
    upstreamConnected: eventProxy.isConnected,
    bufferedEvents: eventProxy.getRecentEvents().length,
  })
);

// Audio playlist — returns shuffled list of tracks in public/audio
app.get("/playlist", (c) => {
  try {
    const audioDir = resolve(APP_ROOT, "public", "audio");
    const files = readdirSync(audioDir)
      .filter((f) => f.endsWith(".mp3"))
      .sort(() => Math.random() - 0.5)
      .map((f) => ({
        name: f.replace(/^\d+-/, "").replace(/-/g, " ").replace(/\.mp3$/, ""),
        url: `/public/audio/${f}`,
      }));
    return c.json(files);
  } catch {
    return c.json([]);
  }
});

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "terrarium" }));

console.log(`Terrarium running at http://localhost:${PORT}`);
console.log(`  Agents SSE upstream: ${AGENTS_URL}`);
export default {
  port: PORT,
  fetch: app.fetch,
  // SSE streams need long-lived connections
  idleTimeout: 120,
};
