import { parseFeed } from "https://deno.land/x/rss@0.5.5/mod.ts";
import type { FeedEntry } from "https://deno.land/x/rss@0.5.5/src/types/feed.ts";
export default async function (
  url: string,
  options: RequestInit,
): Promise<FeedEntry[]> {
  const feedResult = await fetch(url, options);
  const xml = await feedResult.text();
  const feed = await parseFeed(xml);
  return feed.entries;
}
