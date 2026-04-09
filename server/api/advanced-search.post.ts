import { GoogleGenAI } from "@google/genai";
import { MeiliSearch, type SearchParams } from "meilisearch";
import { z } from "zod";
import type { Rule } from "../utils";

const requestSchema = z.object({
  query: z.string().min(1),
  year: z.string().default(new Date().getFullYear().toString()),
  sections: z.array(z.string()).default([]),
});

const decisionSchema = z.object({
  satisfied: z.boolean().default(false),
  followupSearches: z.array(z.string()).default([]),
  rerankInstruction: z.string().default(""),
  filterInstruction: z.string().default(""),
});

const rankingSchema = z.object({
  rankedIds: z.array(z.string()).default([]),
  droppedIds: z.array(z.string()).default([]),
  highlights: z
    .array(
      z.object({
        id: z.string(),
        phrases: z.array(z.string()).default([]),
      })
    )
    .default([]),
});

type GeminiDecision = z.infer<typeof decisionSchema>;
type GeminiRanking = z.infer<typeof rankingSchema>;

type GeminiResponseSchema = {
  type: "OBJECT" | "ARRAY" | "STRING" | "NUMBER" | "INTEGER" | "BOOLEAN";
  properties?: Record<string, GeminiResponseSchema>;
  items?: GeminiResponseSchema;
  required?: string[];
};

const MEILI_READ_KEY = "2db41b6a1ce3e0daf62e36d67f996e60f41a07807588971a050d7bfb74df5efe";
const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

const escapeFilterValue = (value: string) => value.replace(/'/g, "\\'");

const cleanText = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compactHit = (hit: Rule) => ({
  id: hit.id,
  name: hit.name,
  type: hit.type,
  section: (hit as Rule & { section?: string }).section || "",
  summary: cleanText(hit.summary || hit.textContent || "").slice(0, 280),
});

const rankingCandidateHit = (hit: Rule) => ({
  id: hit.id,
  name: hit.name,
  type: hit.type,
  section: (hit as Rule & { section?: string }).section || "",
  summary: cleanText(hit.summary || hit.textContent || "").slice(0, 280),
  text: hit.text,
});

const decisionResponseSchema: GeminiResponseSchema = {
  type: "OBJECT",
  required: ["satisfied", "followupSearches", "rerankInstruction", "filterInstruction"],
  properties: {
    satisfied: { type: "BOOLEAN" },
    followupSearches: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    rerankInstruction: { type: "STRING" },
    filterInstruction: { type: "STRING" },
  },
};

const rankingResponseSchema: GeminiResponseSchema = {
  type: "OBJECT",
  required: ["rankedIds", "droppedIds", "highlights"],
  properties: {
    rankedIds: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    droppedIds: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    highlights: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["id", "phrases"],
        properties: {
          id: { type: "STRING" },
          phrases: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
      },
    },
  },
};

const callGeminiJson = async <T>(gemini: GoogleGenAI, prompt: string, responseSchema: GeminiResponseSchema): Promise<T> => {
  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text?.trim() || "{}";
    return JSON.parse(text) as T;
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown Gemini SDK error";
    throw createError({
      statusCode: 502,
      statusMessage: `Gemini request failed: ${details.slice(0, 300)}`,
    });
  }
};

const getGlossary = async (index: ReturnType<MeiliSearch["index"]>) => {
  try {
    const { facetHits } = await index.searchForFacetValues({
      facetName: "section",
      facetQuery: "glossary",
    });
    const sections = [...new Set(facetHits.map((hit) => hit.value).filter((value) => /glossary/i.test(value)))];

    const filter = sections.length
      ? sections.map((value) => `section = '${escapeFilterValue(value)}'`).join(" OR ")
      : undefined;

    const glossarySearch = await index.search<Rule>("", {
      ...(filter ? { filter } : {}),
      limit: 140,
    });

    const terms = glossarySearch.hits
      .filter((hit) => /glossary/i.test((hit as Rule & { section?: string }).section || hit.summary || ""))
      .slice(0, 80)
      .map((hit) => `- ${hit.name}: ${cleanText(hit.summary || hit.textContent || "").slice(0, 180)}`);

    return terms.join("\n").slice(0, 9000);
  } catch {
    return "";
  }
};

const searchRules = async (
  index: ReturnType<MeiliSearch["index"]>,
  term: string,
  sections: string[]
) => {
  const options: SearchParams = {
    limit: 8,
  };

  options.hybrid = {
    embedder: "default",
    semanticRatio: 0.5,
  };


  if (sections.length) {
    options.filter = sections.map((section) => `section = '${escapeFilterValue(section)}'`).join(" OR ");
  }

  const results = await index.search<Rule>(term, options);
  return results.hits;
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const query = requestSchema.parse(body || {});
  const runtimeConfig = useRuntimeConfig(event);
  const geminiKey = runtimeConfig.geminiKey || process.env.GEMINI_KEY;

  if (!geminiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "GEMINI_KEY is missing",
    });
  }

  const gemini = new GoogleGenAI({ apiKey: geminiKey });

  const client = new MeiliSearch({
    host: "https://meilisearch.frctools.com",
    apiKey: MEILI_READ_KEY,
  });

  const index = client.index(`rules-${query.year}`);
  const glossary = await getGlossary(index);

  const hitMap = new Map<string, Rule>();
  const usedSearches = new Set<string>();
  let pendingSearches = [query.query];
  let lastDecision: GeminiDecision = {
    satisfied: false,
    followupSearches: [],
    rerankInstruction: "",
    filterInstruction: "",
  };
  const maxRounds = 2;

  for (let round = 1; round <= maxRounds; round++) {
    const currentSearches = [...new Set(pendingSearches.map((search) => search.trim()).filter(Boolean))]
      .filter((search) => !usedSearches.has(search))
      .slice(0, 4);

    if (!currentSearches.length) {
      break;
    }

    const roundDetails: Array<{ search: string; hits: ReturnType<typeof compactHit>[] }> = [];
    let newHits = 0;

    for (const search of currentSearches) {
      usedSearches.add(search);
      const hits = await searchRules(index, search, query.sections);
      for (const hit of hits) {
        if (!hitMap.has(hit.id)) {
          newHits += 1;
        }
        hitMap.set(hit.id, hit);
      }
      roundDetails.push({
        search,
        hits: hits.map(compactHit),
      });
    }

    const allCompactHits = [...hitMap.values()].slice(0, 30).map(compactHit);

    const decisionPrompt = [
      "You are helping with advanced FRC/FTC manual search quality control.",
      "Decide if we already have enough high-quality results for the original user query.",
      "If not satisfied, suggest up to 4 next search queries that should improve recall/precision.",
      "At least half of followup searches must target implication-related terms: downstream effects, constraints, edge cases, penalties, safety impacts, interactions with other rules, or compliance risks.",
      "When satisfied, provide rerank/filter instructions for a final pass.",
      "Return JSON only using this shape:",
      '{"satisfied":boolean,"followupSearches":string[],"rerankInstruction":string,"filterInstruction":string}',
      "",
      `Original query: ${query.query}`,
      `Round: ${round}/${maxRounds}`,
      `Glossary context:\n${glossary || "No glossary context found."}`,
      `Round search results: ${JSON.stringify(roundDetails)}`,
      `Accumulated hits: ${JSON.stringify(allCompactHits)}`,
      "Be strict: satisfied should be true only if the accumulated hits already answer the query well.",
    ].join("\n");

    const parsedDecision = await callGeminiJson<GeminiDecision>(gemini, decisionPrompt, decisionResponseSchema);
    lastDecision = decisionSchema.parse(parsedDecision);

    if (lastDecision.satisfied) {
      break;
    }

    pendingSearches = lastDecision.followupSearches;
  }

  const collectedHits = [...hitMap.values()];
  let rankedHits = collectedHits;
  let ranking: GeminiRanking = {
    rankedIds: [],
    droppedIds: [],
    highlights: [],
  };

  if (collectedHits.length) {
    const rankingPrompt = [
      "You are finalizing advanced search results for a rules manual query.",
      "Rerank and filter the candidate hits to prioritize relevance and remove low-value results.",
      "Use any provided instructions from the previous step.",
      "For each relevant kept hit, provide short verbatim highlight phrases from the candidate text/summary.",
      "These should not cross punctuation boundaries and capture key meaningful snippets that justify the ranking- not just top-level summary statements.",
      "Please prioritize highlights that capture implications, constraints, edge cases, penalties, safety impacts, interactions with other rules, or compliance risks mentioned in the hits.",
      "If the specific reason a hit is relavent is later in the hit text or in a list, it is **crucial** to include a highlight phrase that captures that reason, even in blue boxes.",
      "When assessing this, think about the user's original query and what they are likely looking for, and which parts of the hit text best match that intent.",
      "Each phrase should be <= 120 characters and there should be at most 5 phrases per hit.",
      "Return JSON only using this shape:",
      '{"rankedIds":string[],"droppedIds":string[],"highlights":[{"id":string,"phrases":string[]}]}',
      "Only include IDs that exist in the candidate list.",
      "",
      `Original query: ${query.query}`,
      `Rerank instruction: ${lastDecision.rerankInstruction || "none"}`,
      `Filter instruction: ${lastDecision.filterInstruction || "none"}`,
      `Candidate hits with full rule text: ${JSON.stringify(collectedHits.map(rankingCandidateHit))}`,
    ].join("\n");

    try {
      ranking = rankingSchema.parse(await callGeminiJson<GeminiRanking>(gemini, rankingPrompt, rankingResponseSchema));
    } catch {
      ranking = {
        rankedIds: collectedHits.map((hit) => hit.id),
        droppedIds: [],
        highlights: [],
      };
    }

    const byId = new Map(collectedHits.map((hit) => [hit.id, hit]));
    const droppedSet = new Set(ranking.droppedIds);
    const ranked = ranking.rankedIds
      .map((id) => byId.get(id))
      .filter((hit): hit is Rule => Boolean(hit))
      .filter((hit) => !droppedSet.has(hit.id));

    const rest = collectedHits.filter((hit) => !droppedSet.has(hit.id) && !ranking.rankedIds.includes(hit.id));
    rankedHits = [...ranked, ...rest].slice(0, 12);
  }

  const allowedHighlightIds = new Set(rankedHits.map((hit) => hit.id));
  const highlightsById = new Map(
    ranking.highlights
      .filter((entry) => allowedHighlightIds.has(entry.id))
      .map((entry) => [
        entry.id,
        [...new Set(entry.phrases.map((phrase) => phrase.trim()).filter(Boolean))].slice(0, 5).map((phrase) => phrase.slice(0, 120)),
      ])
  );

  return {
    hits: rankedHits.map((hit) => ({
      id: hit.id,
      name: hit.name,
      type: hit.type,
      text: hit.text,
      summary: hit.summary,
      section: (hit as Rule & { section?: string }).section || "",
      highlights: highlightsById.get(hit.id) || [],
    })),
  };
});
