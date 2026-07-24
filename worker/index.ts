/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

// Minimal stubs for Cloudflare globals — @cloudflare/workers-types is not installed.
interface Fetcher {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D1Database = any;

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => {
          const assetUrl = new URL(path, request.url);
          if (env?.ASSETS?.fetch) {
            return env.ASSETS.fetch(new Request(assetUrl));
          }
          return fetch(assetUrl);
        },
        transformImage: async (_body, { width: _width, format: _format, quality: _quality }) => {
          // Cloudflare Image Resizing: pass cf.image options on a subrequest.
          // The IMAGES binding does not exist — transformations are handled via
          // the cf.image fetch option on Workers that have Image Resizing enabled.
          return new Response(_body);
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
