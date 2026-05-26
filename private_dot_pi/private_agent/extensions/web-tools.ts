import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  // Web Fetch Tool: Fetches a URL and returns clean markdown/text content
  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description: "Fetch contents from a URL and return it as clean text",
    parameters: Type.Object({
      url: Type.String({ description: "The URL to fetch content from" })
    }),
    execute: async (toolCallId, params) => {
      try {
        const response = await fetch(params.url);
        if (!response.ok) {
          return { content: [{ type: "text", text: `HTTP Error: ${response.status} ${response.statusText}` }] };
        }
        const text = await response.text();
        // Simple HTML-to-text conversion (strip scripts, style tags, and return body text)
        let cleanText = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (cleanText.length > 30000) {
          cleanText = cleanText.substring(0, 30000) + "\n... (truncated)";
        }
        return { content: [{ type: "text", text: cleanText }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }] };
      }
    }
  });

  // Web Search Tool: Searches Brave, Exa, or fallback local SearXNG
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: "Search the web using SearXNG, Brave, or Exa Search",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" })
    }),
    execute: async (toolCallId, params) => {
      try {
        const braveKey = process.env.BRAVE_API_KEY;
        const exaKey = process.env.EXA_API_KEY;

        if (braveKey) {
          const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(params.query)}`, {
            headers: { "Accept": "application/json", "X-Subscription-Token": braveKey }
          });
          const data = await res.json() as any;
          const results = data.web?.results?.map((r: any) => `### ${r.title}\nURL: ${r.url}\n${r.description}`).join("\n\n") || "No results found.";
          return { content: [{ type: "text", text: results }] };
        }

        if (exaKey) {
          const res = await fetch("https://api.exa.ai/search", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": exaKey },
            body: JSON.stringify({ query: params.query, useAutoprompt: true, numResults: 5 })
          });
          const data = await res.json() as any;
          const results = data.results?.map((r: any) => `### ${r.title}\nURL: ${r.url}\nScore: ${r.score}`).join("\n\n") || "No results found.";
          return { content: [{ type: "text", text: results }] };
        }

        // Default: Use local SearXNG reverse-proxied at search.home.ankitson.com
        const searchUrl = `https://search.home.ankitson.com/search?q=${encodeURIComponent(params.query)}&format=json`;
        const res = await fetch(searchUrl);
        const data = await res.json() as any;
        const results = data.results?.slice(0, 8).map((r: any) => `### ${r.title}\nURL: ${r.url}\n${r.content}`).join("\n\n") || "No results found.";
        return { content: [{ type: "text", text: results }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }] };
      }
    }
  });
}
