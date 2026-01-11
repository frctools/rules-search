import fs from "fs";
import { JSDOM } from "jsdom";
import { consola } from "consola";
import { MeiliSearch, MeiliSearchApiError, type Embedders } from "meilisearch";
import TurndownService from "turndown";

export const ruleRegex = /^([a-zA-Z])(\d{3})$/;
const turndown = new TurndownService();

/**
 * Reads HTML file from disk instead of fetching from remote URL
 */
export const getDocumentFromFile = (filePath: string = "2026GameManual.html") => {
  consola.info(`Reading HTML from ${filePath}`);
  const html = fs.readFileSync(filePath, "utf8");
  const dom = new JSDOM(html);
  const document = dom.window.document;
  return document;
};

/**
 * Fixes image URLs since we aren't hosted on the same path as the real manual
 */
export const fixImages = (
  currYear: number,
  document: Document,
  ftc: boolean
) => {
  const images = document.querySelectorAll("img");
  const prefix = !ftc
    ? `https://assets.frctools.com/`
    : `https://ftc-resources.firstinspires.org/file/ftc/game/cm-html/`;
  images.forEach((image) => {
    const currentSrc = image.getAttribute("src");
    if (currentSrc) {
      const newSrc = prefix + currentSrc;
      image.setAttribute("src", newSrc);
    }
  });
};

/**
 * Switches rule links from anchor links to frctools.com links
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

/**
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
 * Replace specific text in document with tooltip element
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

    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        container.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }

      const span = document.createElement("tooltip");
      span.setAttribute("label", attributeValue);
      span.textContent = match[0];
      container.appendChild(span);

      lastIndex = regex.lastIndex;
    }

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

/**
 * Uses the new parsing approach: finds p/h4 elements matching rule pattern,
 * then collects siblings until the next rule
 */
export const getRulesCorpus = (
  currYear: number,
  document: Document,
  ftc: boolean
) => {
  let output: Record<string, Rule> = {};
  
  // Regex to find text matching (letter)(3 digit number) - e.g., A001, B123
  const regex = /^([A-Z])(\d{3})/;
  
  // Get all p and h4 elements
  const elements = [...document.querySelectorAll("p, h4")];
  
  for (let element of elements) {
    let text = element.textContent || "";
    
    // Skip if doesn't match the regex pattern
    if (!text.match(regex)) {
      continue;
    }
    
    const additionalContent: AdditionalContent[] = [];
    const htmlContent: string[] = [element.outerHTML];
    let nextElement = element.nextElementSibling;
    
    // Collect all sibling elements until we hit the next rule
    while (nextElement && !nextElement.textContent?.match(regex) && nextElement.className !== 's29' && !nextElement?.querySelector('.s29') && !nextElement?.querySelector('.s61') && !nextElement.className?.includes('s61')) {
      text += nextElement.textContent;
      htmlContent.push(nextElement.outerHTML);
      
      additionalContent.push({
        text: nextElement.textContent,
        type: nextElement.querySelector('[class*="BlueBox"]')
          ? AdditionalContentType.Box
          : AdditionalContentType.Text,
      } as AdditionalContentText);
      
      let images = nextElement.querySelectorAll("img");
      for (const image of images) {
        additionalContent.push({
          type: AdditionalContentType.Image,
          src: image.src,
          width: image.width,
          height: image.height,
          alt: image.alt,
        } as AdditionalContentImage);
      }
      
      nextElement = nextElement.nextElementSibling;
    }
    
    // Extract the rule key
    const matchResult = text.match(regex);
    if (matchResult) {
      let key = matchResult[0];
      const sectionText = element.parentElement?.querySelector<HTMLHeadingElement>('div > h1')?.textContent?.replace(/\s+|\n/, ' - ').replace(/\n/g, " ") || "";
      
      output[key] = {
        name: key,
        type: Type.Rule,
        text: htmlContent.join("\n"),
        markdownContent: turndown.turndown(htmlContent.join("\n")),
        summary: element.textContent || "",
        additionalContent,
        evergreen: false,
        textContent: text,
        section: sectionText
      };
    }
  }
  
  // Parse h3 tags with data-list-text attribute for sections
  const h3Elements = [...document.querySelectorAll("[data-list-text]")];
  const h3Regex = /^(\d+)(\.\d+)?/;
  
  for (let element of h3Elements) {
    let text = element.textContent || "";
    const dataListText = element.getAttribute("data-list-text");
    
    if (!dataListText || !dataListText.match(h3Regex)) {
      continue;
    }
    
    let html = element.outerHTML;
    const matchResult = dataListText.match(h3Regex);
    
    if (matchResult) {
      let key = matchResult[0];
      const sectionText = element.parentElement?.querySelector<HTMLHeadingElement>('div > h1')?.textContent?.replace(/\s+|\n/, ' - ').replace(/\n/g, " ") || "";
      
      output[key] = {
        name: key,
        type: Type.Section,
        text: html,
        markdownContent: turndown.turndown(html),
        summary: text,
        additionalContent: [],
        evergreen: false,
        textContent: text,
        section: sectionText
      };
    }
  }
  
  return output;
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
  
  // Read from local file instead of fetching
  const document = getDocumentFromFile("2026GameManual.html");
  
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
    consola.log("Dry run. Writing rules to matches.json...");
    fs.writeFileSync("matches.json", JSON.stringify(rules, null, 2));
    consola.log(`Found ${Object.values(rules).length} rules`);
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
