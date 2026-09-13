// scraper/dynamic_scraper.js
// Usage: node scraper/dynamic_scraper.js "DevOps Engineer"
// Outputs: JSON array of discussion objects to stdout

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve MCP server path — use env var or relative default
const MCP_SERVER_PATH = process.env.MCP_SERVER_PATH ||
  path.resolve(__dirname, "../reddit-unofficial-api/build/index.js");

const CHROME_CDP_URL = process.env.CHROME_CDP_URL || "http://localhost:9222";

const transport = new StdioClientTransport({
  command: "node",
  args: [MCP_SERVER_PATH],
  env: { ...process.env, CHROME_CDP_URL },
});

const client = new Client({
  name: "radardev-dynamic-scraper",
  version: "1.0.0",
});

const SUBREDDITS = [
  "developersIndia",
  "cscareerquestions",
  "webdev",
  "cybersecurity",
  "devops",
  "learnprogramming",
];

const COMPANY_EXTRA_SUBREDDITS = [
  "cscareerquestions",
  "developersIndia",
  "interviews",
  "leetcode",
];

function buildQueries(roleName, targetCompany = "", mode = "role") {
  if (mode === "trending") {
    return [
      "most in demand tech skills roles 2025 2026 hiring",
      "which tech roles are hiring the most India global",
      "highest paying tech domains demand fresher senior",
      "career transition tech roles boom hiring",
    ];
  }

  if (mode === "timeline") {
    return [
      `${roleName} how long to learn job ready fresher`,
      `${roleName} roadmap timeline hours required to crack interview`,
      `how many months to become junior ${roleName}`,
      `${roleName} self taught learning duration experience`,
    ];
  }

  if (mode === "companies") {
    return [
      `${roleName} hiring companies list tier offer package`,
      `who is hiring ${roleName} freshers experience CTC`,
      `top companies for ${roleName} career growth salary`,
      `${roleName} interview experience offer letter`,
    ];
  }

  const base = [
    `${roleName} fresher roadmap entry level`,
    `${roleName} entry level skills India 2024`,
    `${roleName} interview questions experience hiring`,
    `${roleName} projects for resume portfolio`,
  ];

  if (targetCompany && targetCompany.trim()) {
    const comp = targetCompany.trim();
    return [
      `${comp} ${roleName} interview experience questions`,
      `${comp} hiring process ${roleName} rounds`,
      `${comp} ${roleName} technical round topics questions asked`,
      `got rejected from ${comp} ${roleName} interview mistake`,
      `${comp} ${roleName} package CTC expectations`,
      ...base,
    ];
  }
  return base;
}

function extractPosts(rawJsonText) {
  try {
    const parsed = JSON.parse(rawJsonText);
    const children = parsed.children || parsed.data?.children || [];
    return children.map((c) => c.data).filter(Boolean);
  } catch {
    return [];
  }
}

function extractComments(rawJsonText) {
  try {
    const parsed = JSON.parse(rawJsonText);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c) =>
          c.author &&
          c.author.toLowerCase() !== "automoderator" &&
          c.body &&
          c.body !== "[deleted]" &&
          c.body !== "[removed]" &&
          c.body.length > 40
      )
      .map((c) => ({
        author: c.author,
        body: c.body.trim(),
        score: c.score || 0,
      }));
  } catch {
    return [];
  }
}

async function scrapeRoleOnDemand(roleName, targetCompany = "", mode = "role") {
  console.error(`[Reddit Scraper] 🚀 Starting live Reddit scrape (Mode: ${mode}, Role: "${roleName}"${targetCompany ? `, Target Company: "${targetCompany}"` : ''})`);
  
  let activeSubreddits = SUBREDDITS;
  const lowerRole = roleName.toLowerCase();
  if (mode === "trending") {
    activeSubreddits = ["developersIndia", "cscareerquestions", "webdev", "MachineLearning", "devops", "technology"];
  } else if (mode === "timeline") {
    activeSubreddits = ["learnprogramming", "cscareerquestions", "developersIndia", "webdev", "devops"];
  } else if (mode === "companies") {
    activeSubreddits = ["developersIndia", "cscareerquestions", "interviews", "leetcode", "csJobHunts"];
  } else if (lowerRole.includes("blockchain") || lowerRole.includes("solidity") || lowerRole.includes("web3") || lowerRole.includes("crypto") || lowerRole.includes("smart contract") || lowerRole.includes("eth")) {
    activeSubreddits = ["ethdev", "solidity", "web3", "developersIndia", "cscareerquestions"];
  } else if (lowerRole.includes("ios") || lowerRole.includes("swift")) {
    activeSubreddits = ["iOSProgramming", "swift", "apple", "developersIndia"];
  } else if (lowerRole.includes("data") || lowerRole.includes("spark") || lowerRole.includes("analytics")) {
    activeSubreddits = ["dataengineering", "datascience", "SQL", "developersIndia"];
  } else if (lowerRole.includes("game") || lowerRole.includes("unity") || lowerRole.includes("unreal")) {
    activeSubreddits = ["gamedev", "unity3d", "unrealengine", "developersIndia"];
  } else if (lowerRole.includes("embedded") || lowerRole.includes("firmware") || lowerRole.includes("iot") || lowerRole.includes("c++")) {
    activeSubreddits = ["embedded", "C_Programming", "rust", "developersIndia"];
  } else if (lowerRole.includes("qa") || lowerRole.includes("test") || lowerRole.includes("sdet") || lowerRole.includes("automation")) {
    activeSubreddits = ["QualityAssurance", "softwaretesting", "developersIndia"];
  } else if (targetCompany) {
    activeSubreddits = Array.from(new Set([...SUBREDDITS, ...COMPANY_EXTRA_SUBREDDITS]));
  }

  const queries = buildQueries(roleName, targetCompany, mode);
  console.error(`[Reddit Scraper] 📊 Scanning ${activeSubreddits.length} subreddits with ${queries.length} search templates...`);
  
  await client.connect(transport);

  const postMap = new Map();

  for (const subreddit of activeSubreddits) {
    console.error(`[Reddit Scraper] 🌐 Searching r/${subreddit}...`);
    for (const query of queries) {
      try {
        console.error(`[Reddit Scraper]   🔎 Query: "${query}"`);
        const searchRes = await client.callTool({
          name: "reddit_search",
          arguments: { query, subreddit, sort: "relevance", time: "all", limit: 3 },
        });

        const posts = extractPosts(searchRes.content?.[0]?.text || "{}");
        console.error(`[Reddit Scraper]   📥 Fetched ${posts.length} post(s) from r/${subreddit}`);

        for (const post of posts) {
          const key = post.id || post.title;
          if (!key || postMap.has(key)) continue;

          let comments = [];
          try {
            const commentsRes = await client.callTool({
              name: "reddit_get_comments",
              arguments: { url: post.permalink || post.id, sort: "top" },
            });
            comments = extractComments(commentsRes.content?.[0]?.text || "[]").slice(0, 10);
          } catch {
            // comments optional
          }

          const resolvedUrl = post.permalink 
            ? (post.permalink.startsWith("http") ? post.permalink : `https://www.reddit.com${post.permalink}`)
            : (post.url && post.url.startsWith("http") ? post.url : `https://www.reddit.com/r/${post.subreddit || subreddit}`);

          postMap.set(key, {
            role: roleName,
            target_company: targetCompany || null,
            mode,
            subreddit: post.subreddit || subreddit,
            title: post.title || "",
            selftext: post.selftext || "",
            score: post.score || post.ups || 0,
            url: resolvedUrl,
            author: post.author || "anonymous",
            comments,
          });

          console.error(`[Reddit Scraper]     📌 Post [▲${post.score || 0}]: "${(post.title || '').slice(0, 60)}..." (${comments.length} comments)`);

          await new Promise((r) => setTimeout(r, 600)); // rate limit
        }
      } catch (err) {
        console.error(`[Reddit Scraper] ⚠️ Skip r/${subreddit} "${query}": ${err.message}`);
      }
    }
  }

  console.error(`[Reddit Scraper] ✅ Completed! Scraped ${postMap.size} unique discussions.`);
  return Array.from(postMap.values());
}

// CLI entrypoint
const arg1 = process.argv[2] || "";
const arg2 = process.argv[3] || "";

let mode = "role";
let roleName = arg1;
let targetCompany = arg2;

if (arg1 === "--trending") {
  mode = "trending";
  roleName = "Trending Roles";
  targetCompany = "";
} else if (arg1 === "--timeline") {
  mode = "timeline";
  roleName = arg2 || "Software Engineer";
  targetCompany = "";
} else if (arg1 === "--companies") {
  mode = "companies";
  roleName = arg2 || "Software Engineer";
  targetCompany = "";
}

if (!roleName) {
  console.error("Usage: node scraper/dynamic_scraper.js \"Role Name\" [\"Target Company\"] | --trending | --timeline \"Role\" | --companies \"Role\"");
  process.exit(1);
}

scrapeRoleOnDemand(roleName, targetCompany, mode)
  .then((data) => {
    process.stdout.write(JSON.stringify(data));
    process.exit(0);
  })
  .catch((err) => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  });
