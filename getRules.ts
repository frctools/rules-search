import { JSDOM } from "jsdom";
import { consola } from "consola";
import { MeiliSearch, MeiliSearchApiError, type Embedders } from "meilisearch";
import TurndownService from "turndown";

export const ruleRegex = /^([a-zA-Z])(\d{3})$/;
const turndown = new TurndownService();
/**
 * Parses a html buffer as ascii in order to get the charset
 * @param ui8array ui8array of html content
 */
const getBufferEncoding = (ui8array: Uint8Array): string => {
  const decoder = new TextDecoder("ascii");
  const html = decoder.decode(ui8array);
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const contentType = document
    .querySelector('meta[http-equiv="Content-Type"]')
    ?.getAttribute("content");
  if (contentType) {
    const [, charset] = contentType.match(/charset=([^;]+)/) || [];
    if (charset) {
      return charset;
    }
  }
  consola.warn("Defaulting to windows-1252. Check validity.");
  return "windows-1252";
};
export const getDocument = async (currYear: number, ftc: boolean = false) => {
  const res = await fetch(
    !ftc
      ? `https://firstfrc.blob.core.windows.net/frc${currYear}/Manual/HTML/${currYear}${
          currYear < 2024 ? "FRC" : ""
        }GameManual.htm`
      : `https://ftc-resources.firstinspires.org/file/ftc/game/cm-html`
  );

  const arrBuffer = await res.arrayBuffer();
  const ui8array = new Uint8Array(arrBuffer);
  const charset = getBufferEncoding(ui8array);
  const dec = new TextDecoder(charset); // word exports are in windows-1252 text format * just because*

  const html = dec.decode(ui8array);
  // Use jsdom to parse the HTML
  const dom = new JSDOM(html);
  const document = dom.window.document;
  return document;
};
/**
 * Fixes image URLs since we arefn't hosted on the same path as the real manual
 * @param currYear Current year
 * @param document The document to fix
 * @param ftc      Whether it is the FTC manual
 */
export const fixImages = (
  currYear: number,
  document: Document,
  ftc: boolean
) => {
  const images = document.querySelectorAll("img");
  const prefix = !ftc
    ? `https://firstfrc.blob.core.windows.net/frc${currYear}/Manual/HTML/`
    : `https://ftc-resources.firstinspires.org/file/ftc/game/cm-html/`;
  // Iterate through each image and update the src attribute
  images.forEach((image) => {
    const currentSrc = image.getAttribute("src");
    if (currentSrc) {
      // Prefix the image URL with the specified prefix
      const newSrc = prefix + currentSrc;
      image.setAttribute("src", newSrc);
    }
  });
};

/**
 * Switches rule links from anchor links to frctools.com links
 * @param currYear Current year
 * @param document
 */
export const fixRuleLinks = (
  currYear: number,
  document: Document,
  ftc: boolean
) => {
  const links = document.querySelectorAll(`a[href^="#"]`);
  links.forEach((link) => {
    let slug = link.getAttribute("href")?.split("#")[1];
    if (slug?.match(ruleRegex)) {
      link.setAttribute(
        "href",
        `https://frctools.com/${currYear}${ftc ? "-ftc" : ""}/${slug}`
      );
    }
  });
};
/*
 * Fixes the broken rule numbers in A tag names (2024 rules R901 to R906 are in attribute names as 815-820)
 */
export const fixRuleNumbers = (
  currYear: number,
  document: Document,
  ftc: boolean
) => {
  if (currYear !== 2024 || ftc) {
    return consola.warn(`Remove fixRuleNumbers preprocessor`);
  }
  const elements = document.querySelectorAll('[class*="RuleNumber"]');
  elements.forEach((element) => {
    const aTags = element.querySelectorAll("a[name]");
    for (let aTag of aTags) {
      const name = aTag.getAttribute("name");
      if (name?.match(ruleRegex)) {
        const [_, letter, number] = name.match(ruleRegex)!;
        const numberInt = parseInt(number);
        if (numberInt >= 815 && numberInt <= 820 && letter == "R") {
          aTag.setAttribute("name", `${letter}${numberInt + 86}`);
        }
      }
    }
  });
};

export const fixRuleNumbersFtc = (
  currYear: number,
  document: Document,
  ftc: boolean
) => {
  if (currYear !== 2025 || !ftc) {
    return;
  }
  const elements = document.querySelectorAll('[class*="RuleNumber"]');
  elements.forEach((element) => {
    const aTags = [...element.querySelectorAll("a[name]")];
    if (!aTags.length) {
      let tag = Object.assign(document.createElement("a"));
      element.append(tag);
      aTags.push(tag);
    }
    for (let aTag of aTags) {
      const name = aTag.getAttribute("name");
      if (name?.match(ruleRegex)) {
        const [_, letter, number] = name.match(ruleRegex)!;
        const numberInt = parseInt(number);
        if (numberInt >= 421 && numberInt <= 820 && letter == "G") {
          aTag.setAttribute(
            "name",
            element?.querySelector("b:first-child")?.textContent?.trim() || ""
          );
        }
      }
    }
  });
};

/**
 * Removes rulenumber class from broken list item "rules" that shouldn't be rules
 * @param currYear Current year
 * @param document Document object to fix
 * @param ftc Is ftc
 */
export const fixListRules = (
  currYear: number,
  document: Document,
  ftc: boolean
) => {
  if (!ftc && currYear == 2025) {
    const brokenElements = document.querySelectorAll(
      '.RuleNumber-Robot[style="margin-left:1.0in"], .RuleNumber-Robot[style="margin-left:99.35pt;text-indent:-99.35pt"], .RuleNumber-Game[style="margin-left:.75in;text-indent:-.25in"], .RuleNumber-Robot[align="center"]'
    );
    for (const brokenElement of brokenElements) {
      brokenElement.classList.remove("RuleNumber-Game");
      brokenElement.classList.remove("RuleNumber-Robot");
    }
  }
};

export interface Rule {
  name: string;
  type: Type;
  text: string;
  markdownContent: string;
  summary: string;
  additionalContent: AdditionalContent[];
  evergreen: boolean;
  textContent: string;
  section: string;
}

export interface AdditionalContent {
  type: AdditionalContentType;
}
export interface AdditionalContentImage extends AdditionalContent {
  type: AdditionalContentType.Image;
  text?: string;
  src?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export enum AdditionalContentType {
  Box = "box",
  Image = "image",
  Text = "text",
}

export enum Type {
  Rule = "rule",
  Section = "section",
}

export interface AdditionalContentText extends AdditionalContent {
  type: AdditionalContentType.Box | AdditionalContentType.Text;
  text: string;
}
/**
 * Replace specific text in document with tooltip element and
 * @param searchPattern Regex to search for
 * @param attributeValue Attribute value to set
 */
const replaceTextInDocument = (
  document: Document,
  searchPattern: string | RegExp,
  attributeValue: string
) => {
  enum NodeFilter {
    FILTER_REJECT = 2,
    FILTER_ACCEPT = 1,
    FILTER_SKIP = 3,
  }
  const regex =
    searchPattern instanceof RegExp
      ? searchPattern
      : new RegExp(searchPattern, "g");
  const walker = document.createTreeWalker(
    document.body,
    document?.defaultView?.NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        if (
          node.parentNode?.nodeName.toLowerCase() === "script" ||
          node.parentNode?.nodeName.toLowerCase() === "style"
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.textContent?.match(regex)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    }
  );

  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    nodes.push(node);
  }

  nodes.reverse().forEach((textNode) => {
    const text = textNode.textContent;
    if (!text) {
      return;
    }
    const container = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    regex.lastIndex = 0; // Reset regex state
    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        container.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }

      // Add the wrapped match
      const span = document.createElement("tooltip");
      span.setAttribute("label", attributeValue);
      span.textContent = match[0];
      container.appendChild(span);

      lastIndex = regex.lastIndex;
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode?.replaceChild(container, textNode);
  });
};

const insertGlossaryMarkup = (
  currYear: number,
  document: Document,
  ftc: boolean
) => {
  if (ftc || (currYear !== 2024 && currYear !== 2025)) {
    return;
  }
  // enumerate glossary items
  const glossarySection = [...document?.querySelectorAll("h1")]?.find(
    (heading) => heading.textContent?.includes("Glossary")
  )?.parentElement?.parentElement;
  if (!glossarySection) {
    consola.warn("Glossary heading not found");
    return;
  }
  const glossaryTableBody = glossarySection.querySelector("tbody");

  if (!glossaryTableBody) {
    consola.warn("Glossary table body not found");
    return;
  }

  const glossaryItems: Record<string, string> = [
    ...glossaryTableBody.querySelectorAll("tr"),
  ]
    .map((item) => {
      return [
        item.children[0].textContent?.trim() ?? "",
        item.children[1].textContent?.trim() ?? "",
      ];
    })
    .reduce((acc, item) => {
      return { ...acc, [item[0]]: item[1] };
    }, {});
  for (let glossaryTerm in glossaryItems) {
    replaceTextInDocument(
      document,
      `\\b(${glossaryTerm})S?\\b`,
      glossaryItems[glossaryTerm]
    );
  }
};
export const getRulesCorpus = (
  currYear: number,
  document: Document,
  ftc: boolean
) => {
  const sectionsAndRules = document.querySelectorAll(
    `div > h2, [class*="RuleNumber"]`
  );
  let output: Record<string, Rule> = {};
  for (let rule of sectionsAndRules) {
    if (rule.textContent?.trim() == "") {
      consola.warn("Ignoring a rule");
      continue;
    }
    const section = rule.tagName.toLowerCase() == "h2";
    const additionalContent: AdditionalContent[] = [];
    const htmlContent: string[] = [];
    const ruleSelector =
      `:has(h2), h2, [class*=RulesNumber], [class*=TRules-Evergreen], [class*="RuleNumber"]` +
      (section ? `` : `:not([align="center"])`);
    if (!rule.nextElementSibling) continue;
    traverseUntilSelector(ruleSelector, rule, (element: Element) => {
      htmlContent.push(element.outerHTML);
      additionalContent.push({
        text: element.textContent,
        type: element.querySelector('[class*="BlueBox"]')
          ? AdditionalContentType.Box
          : AdditionalContentType.Text,
      } as AdditionalContentText);
      let images = element.querySelectorAll("img");
      for (const image of images) {
        additionalContent.push({
          type: "image",
          src: image.src,
          width: image.width,
          height: image.height,
          alt: image.alt,
        } as AdditionalContentImage);
      }
    });
    const key =
      (section
        ? rule?.textContent?.match(/^\d+\.\d(\.\d)?/)?.[0]
        : [...rule.querySelectorAll("a")]
            .find((element) => {
              return element.getAttribute("name")?.match(ruleRegex);
            })
            ?.getAttribute("name")) ??
      rule?.querySelector("b:first-child")?.textContent?.trim() ??
      rule
        .querySelector(`span.Headline-Evergreen:first-child`)
        ?.textContent?.trim() ??
      `FIXME${Math.floor(Math.random() * 100)}`;
    const sectionText = rule.parentElement?.querySelector<HTMLHeadingElement>('div > h1')?.textContent?.replace(/\s+|\n/, ' - ').replace(/\n/g, " ") || "";
    output[key] = {
      name: key,
      type: section ? Type.Section : Type.Rule,
      text: htmlContent.join("\n"),
      markdownContent: turndown.turndown(htmlContent.join("\n")),
      summary: rule.textContent || "",
      additionalContent,
      evergreen: false,
      textContent: rule?.textContent || "",
      section: sectionText
    };
  }
  return output;
};

/**
 * Recursively traverses DOM elements until a matching selector is found.
 * @param {string} selector The CSS selector to match.
 * @param {Element} element The element to start traversing from.
 * @param {Function} callback The function to call for each matching element. **Is** called on passed in element.
 * @returns {void}
 * @private
 */
const traverseUntilSelector = (
  selector: string,
  element: Element,
  callback: Function
) => {
  callback(element);
  let currentElement = element.nextElementSibling;
  while (currentElement && !currentElement.matches(selector)) {
    callback(currentElement);
    if (!currentElement.nextElementSibling) break;
    currentElement = currentElement.nextElementSibling;
  }
};

export const scrapeRules = async () => {
  const requiredEnvVariables = ["MEILI_WRITE_KEY", "GEMINI_KEY"];
  for (const requiredEnv of requiredEnvVariables) {
    if (!process.env[requiredEnv]) {
      consola.error(`Missing required environment variable: ${requiredEnv}`);
      process.exit(1);
    }
  }
  const ftc = process.env.FTC == "true";
  const currYear = ftc
    ? 2026
    : process.env.YEAR_SPECIFIC
    ? parseInt(process.env.YEAR_SPECIFIC)
    : new Date().getFullYear();
  if (
    currYear == 2025 &&
    !ftc &&
    /* before january 4th*/ new Date() < new Date("2025-01-04")
  ) {
    return;
  }

  const document = await getDocument(currYear, ftc);
  const enabledPreprocessors = [
    fixImages,
    fixRuleLinks,
    fixRuleNumbers,
    fixRuleNumbersFtc,
    fixListRules,
    insertGlossaryMarkup,
  ];
  for (const preprocessor of enabledPreprocessors) {
    consola.info(`Running preprocessor ${preprocessor.name}`);
    preprocessor(currYear, document, ftc);
  }
  const rules = getRulesCorpus(currYear, document, ftc);
  const fixmeCount = Object.keys(rules).filter((name) =>
    name.includes("FIXME")
  ).length;
  if (fixmeCount) {
    consola.error(`Couldn't find name for ${fixmeCount} rules `);
  }

  if (process.env.DRY_RUN === "true") {
    consola.log("Dry run. No changes made to Meilisearch.");
    return;
  }

  consola.info("Scraping done. Writing to meilisearch...");

  const client = new MeiliSearch({
    host: "http://meilisearch.frctools.com",
    apiKey: process.env.MEILI_WRITE_KEY,
  });

  if (!rules) {
    consola.error("No rules found");
    return;
  }

  const index = `rules-${currYear}${ftc ? "-ftc" : ""}`;
  const idx = client.index(index);
  if (process.env.CLEAR === "true") {
    await client.deleteIndexIfExists(index);
  }

  try {
    await idx.fetchInfo();
  } catch (error: any) {
    if (
      error instanceof MeiliSearchApiError &&
      error.cause?.code == "index_not_found"
    ) {
      client.createIndex(index);
      consola.log(`Created index ${index}`);
    } else {
      throw error;
    }
  }
  const attributes = await idx.getFilterableAttributes();
  const wantedAttributes = [
    "text",
    "markdownContent",
    "name",
    "evergreen",
    "type",
    "textContent",
    "section"
  ];
  for (const attribute of wantedAttributes) {
    if (!attributes.includes(attribute)) {
      await idx.updateFilterableAttributes(wantedAttributes);
      break;
    }
  }

  const currEmbedderSettings = await client.index(index).getEmbedders();
  const wantedEmbedderSettings: Embedders = {
    default: {
      source: "rest",
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-exp-03-07:embedContent?key=${process.env.GEMINI_KEY}`,
      request: {
        model: "models/gemini-embedding-exp-03-07",
        content: {
          parts: [
            {
              text: "{{text}}",
            },
          ],
        },
        task_type: "RETRIEVAL_QUERY",
        outputDimensionality: 3072,
      },
      response: {
        embedding: {
          values: "{{embedding}}",
        },
      },
      documentTemplate:
        "A {{doc.type}} named {{doc.name}} for a robotics competition with the content '{{doc.markdownContent}}'",
    },
  };
  if (
    !currEmbedderSettings ||
    !Object.keys(currEmbedderSettings).length ||
    !currEmbedderSettings["default"]
  ) {
    await client.index(index).updateEmbedders(wantedEmbedderSettings);
  }
  consola.log(`Uploading ${Object.keys(rules).length} rules`);
  client
    .index(index)
    .addDocuments(
      Object.values(rules).map((rule) => {
        return {
          ...rule,
          id: btoa(rule.name).replaceAll("=", ""),
        };
      }),
      { primaryKey: "id" }
    )
    .then((res) => consola.log(res))
    .catch((err) => consola.error(err));
};
await scrapeRules();
