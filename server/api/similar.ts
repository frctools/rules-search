import { MeiliSearch } from "meilisearch";
import { Rule } from "../utils";
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);

  let id = url.searchParams?.get("id") ?? "";
  let year = url.searchParams.get("year") ?? new Date().getFullYear();
  const MEILI_READ_KEY = `2db41b6a1ce3e0daf62e36d67f996e60f41a07807588971a050d7bfb74df5efe`;
  const client = new MeiliSearch({
    host: "https://meilisearch.frctools.com",
    apiKey: MEILI_READ_KEY,
  });
  const indexName = `rules-${year}`;
  const index = client.index(indexName);
  const searchResults = await index.searchSimilarDocuments<Rule>({
    id: id,
    embedder: "default"
  });
  if (searchResults.hits.length === 0) {
    throw { error: "no such rule" };
  }
  return searchResults.hits.slice(0, 4);
});
