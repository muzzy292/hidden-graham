// Claude API calls — quadrant suggestion, action plan, weekly digest
// Uses claude-haiku-4-5-20251001 for speed on short tasks; sonnet for digest.

const CLAUDE_API = "https://api.anthropic.com/v1/messages";

async function _call(apiKey, model, messages, maxTokens = 512) {
  const resp = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
      // CORS note: Anthropic allows browser requests from any origin
      "anthropic-dangerous-allow-browser": "true"
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return { error: err?.error?.message || `HTTP ${resp.status}` };
  }
  const data = await resp.json();
  return { text: data.content?.[0]?.text || "" };
}

// Returns { quadrant: "ui"|"ni"|"un"|"nn", reason: string } or { error }
export async function suggestQuadrant(title, notes, apiKey) {
  const prompt = `You help a couple prioritise their life goals using the Eisenhower matrix.

Item title: "${title}"
Notes: "${notes || "none"}"

Classify this item into exactly one quadrant:
- ui = This Month (top priority, do it soon)
- ni = This Year (important but not urgent)
- un = One Day (worth doing, lower priority)
- nn = Maybe Never (nice idea, park it for now)

Reply with JSON only, no other text:
{"quadrant":"<key>","reason":"<one sentence explaining the classification>"}`;

  const result = await _call(apiKey, "claude-haiku-4-5-20251001", [
    { role: "user", content: prompt }
  ]);
  if (result.error) return result;

  try {
    const json = JSON.parse(result.text.replace(/```json|```/g, "").trim());
    const validKeys = ["ui", "ni", "un", "nn"];
    if (!validKeys.includes(json.quadrant)) throw new Error("bad key");
    return json;
  } catch {
    return { error: "Claude returned an unexpected format. Try again." };
  }
}

// Returns { steps: string[] } or { error }
export async function generateActionPlan(title, notes, apiKey) {
  const prompt = `You help a couple break down their goals into actionable steps.

Goal/Project: "${title}"
Notes: "${notes || "none"}"

Write 3 to 5 concrete, specific milestone steps to achieve this.
Reply with JSON only:
{"steps":["step 1","step 2","step 3"]}`;

  const result = await _call(apiKey, "claude-haiku-4-5-20251001", [
    { role: "user", content: prompt }
  ]);
  if (result.error) return result;

  try {
    const json = JSON.parse(result.text.replace(/```json|```/g, "").trim());
    if (!Array.isArray(json.steps)) throw new Error("bad format");
    return json;
  } catch {
    return { error: "Claude returned an unexpected format. Try again." };
  }
}

// Returns { text: string } or { error }
// items = full items array from Firestore
export async function weeklyDigest(items, apiKey) {
  const open = items.filter(i => !i.done);
  const summary = open.map(i =>
    `- [${i.quadrant.toUpperCase()}] (${i.type}) ${i.title}${i.dueDate ? ` — due ${i.dueDate}` : ""}`
  ).join("\n");

  const prompt = `You are a personal coach helping a couple review their week.

Here are their open items (${open.length} total) from their priority matrix:

${summary || "No open items."}

Write a concise weekly review (200–300 words) covering:
1. What they should focus on THIS week (do-first quadrant + anything overdue)
2. What to schedule for later in the week or month
3. One encouraging observation about their priorities
4. One gentle question to consider together

Write in a warm, direct, supportive tone. Use plain text, no markdown headers.`;

  const result = await _call(apiKey, "claude-sonnet-4-6", [
    { role: "user", content: prompt }
  ], 600);

  return result;
}
