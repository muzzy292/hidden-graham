// Claude receipt & email scanning for tax deductions

const PROMPT = `You are an Australian tax assistant. Extract deduction information and return ONLY valid JSON — no explanation, no markdown, just the JSON object:
{
  "merchant": "business/store name",
  "date": "YYYY-MM-DD",
  "amount": 0.00,
  "gst": 0.00,
  "category": "work-related|vehicle-travel|home-office|phone-internet|self-education|donations|investment|other",
  "description": "brief description of what was purchased and why it is deductible"
}
Use null for any field you cannot determine. Amount should be the total paid (inc GST). GST is 1/11th of the total if the supplier is GST-registered.`;

async function _callClaude(messages, apiKey) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-allow-browser": "true"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages
    })
  });
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  const data = await resp.json();
  const text = data.content?.[0]?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in response");
  return JSON.parse(match[0]);
}

export async function scanReceiptImage(file, apiKey) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return _callClaude([{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
      { type: "text",  text: PROMPT }
    ]
  }], apiKey);
}

export async function scanEmailText(emailText, apiKey) {
  return _callClaude([{
    role: "user",
    content: `${PROMPT}\n\nText to analyse:\n${emailText}`
  }], apiKey);
}
