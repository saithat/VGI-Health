// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createServer, request } from "node:http";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { acceptedEncoding, sendArtifact } from "../scripts/artifact-response";

describe("compressed repository artifacts", () => {
  it("negotiates Brotli/gzip and honors refused encodings", () => {
    expect(acceptedEncoding("gzip, br")).toBe("br");
    expect(acceptedEncoding("br;q=0, gzip")).toBe("gzip");
    expect(acceptedEncoding("br;q=0.1, gzip;q=0.9")).toBe("gzip");
    expect(acceptedEncoding("identity")).toBeNull();
  });
  it("serves compressed content, varies by encoding and revalidates with ETag", async () => {
    const source = Buffer.from(
      JSON.stringify({ content: "recorded outcome ".repeat(500) }),
    );
    const server = createServer((req, res) => {
      void sendArtifact(req, res, "test", source);
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test server");
    const get = (headers: Record<string, string>) =>
      new Promise<{
        body: Buffer;
        status: number;
        headers: import("node:http").IncomingHttpHeaders;
      }>((done, reject) => {
        request(
          { hostname: "127.0.0.1", port: address.port, headers },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () =>
              done({
                body: Buffer.concat(chunks),
                status: res.statusCode ?? 0,
                headers: res.headers,
              }),
            );
          },
        )
          .on("error", reject)
          .end();
      });
    try {
      const br = await get({ "accept-encoding": "br" });
      expect(br.headers["content-encoding"]).toBe("br");
      expect(br.headers.vary).toBe("Accept-Encoding");
      expect(brotliDecompressSync(br.body)).toEqual(source);
      const gz = await get({ "accept-encoding": "gzip" });
      expect(gunzipSync(gz.body)).toEqual(source);
      const cached = await get({ "if-none-match": String(br.headers.etag) });
      expect(cached.status).toBe(304);
      expect(cached.body.length).toBe(0);
    } finally {
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    }
  });
});
