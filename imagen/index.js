import { createApp, eventHandler, toWebHandler, createRouter } from "h3";
import puppeteer from "@cloudflare/puppeteer";

const takeScreenshot = async (env, rule) => {
  let img;
  img = await env.SCREENSHOT_CACHE.get(rule, { type: "arrayBuffer" });
  if (!img) {
    const browser = await puppeteer.launch(env.BROWSER, {
      defaultViewport: {
        width: 2400,
        height: 1080,
      },
    });

    const page = await browser.newPage();

    await page.goto(`https://frctools.com/2026/rule/${rule}`);
    await page.addStyleTag({
      content: `
      [role="alert"] {
        display: none !important;
      }`
    })
    const element = await page.waitForSelector(".prose");
    if (!element) {
      throw new Error("Could not find rule");
    }
    img = await element.screenshot({
      optimizeForSpeed: true,
    });
    await env.SCREENSHOT_CACHE.put(rule, img, {
      expirationTtl: 60 * 60 * 24,
    });
    await browser.close();
  }
  return img;
};
const app = createApp();
const router = createRouter();
router.get(
  "/rule/:rule/image.png",
  eventHandler(async (event) => {

    const img = await takeScreenshot(event.context['cloudflare'].env, event.context.params.rule.toUpperCase());
    return new Response(img, {
      headers: {
        "Content-Type": "image/png",
      },
    });
  }),
);
app.use(router);

const handler = toWebHandler(app);

export default {
  async fetch(request, env, ctx) {
    return handler(request, {
      cloudflare: { env, ctx },
    });
  },
};
