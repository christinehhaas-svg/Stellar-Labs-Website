import { request, type FullConfig } from "@playwright/test";

/** Wait for the two existing managed services; never start duplicate servers. */
export default async function previewReady(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL;
  const client = await request.newContext({ baseURL });
  try {
    for (const path of ["/", "/__mockup/preview/stellar-labs/Homepage"]) {
      const deadline = Date.now() + 60_000;
      let lastStatus = "no response";
      let ready = false;
      while (Date.now() < deadline) {
        try {
          const response = await client.get(path, { timeout: 5000 });
          lastStatus = String(response.status());
          if (response.ok() && (await response.text()).includes("/@vite/client")) {
            ready = true;
            break;
          }
        } catch (error) {
          lastStatus = String(error);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (!ready) throw new Error(`Preview ${path} is not ready (${lastStatus}). ${process.env.HOMEPAGE_TEST_STANDALONE === "1" ? "Check the CI preview-server logs." : "Start the existing Stellar review and Canvas workflows."}`);
    }
  } finally {
    await client.dispose();
  }
}
