import { MeiliSearch, type SearchParams } from "meilisearch";
import { Rule } from "../utils";
import { z } from "zod";
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "*",
  });
  if (event.method === "OPTIONS") {
    event.node.res.statusCode = 204;
    event.node.res.statusMessage = "No Content.";
    return "OK";
  }

  const MEILI_READ_KEY = `2db41b6a1ce3e0daf62e36d67f996e60f41a07807588971a050d7bfb74df5efe`;
  const query = await 
  (event, (data) => {
    return z
      .object({
        query: z.string().default(""),
        year: z.string({ coerce: true }).default(new Date().getFullYear().toString()),
        semantic: z.enum(['true', 'false']).transform((value) => value === 'true').default(true),
        sections: z.string().optional(),
      })
      .parse(data);
  });

  if (query.query == "") {
    return {
      hits: [],
    };
  }
  const client = new MeiliSearch({
    host: "https://meilisearch.frctools.com",
    apiKey: MEILI_READ_KEY,
  });
  const indexName = `rules-${query.year}`;
  const index = await client.index(indexName);
  let options: SearchParams = {};
  if (query.semantic) {
    options["hybrid"] = {
      embedder: "default",
      semanticRatio: 0.5,
    };
  }

  if (query.sections) {
   options["filter"] = query.sections;
  }
  const searchResults = await index.search<Rule>(query.query, options);
  if (
    !searchResults?.hits?.length &&
    (searchResults as any).code == "invalid_search_embedder"
  ) {
    throw createError({
      statusCode: 501,
      statusMessage:
        "Rules are currently being reindexed. Email support@frctools.com if this continues.",
    });
  }
  return searchResults;
});
/*
export async function OPTIONS({}) {
  return new Response('', {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });

}*/
