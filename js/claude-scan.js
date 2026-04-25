// Claude receipt & email scanning for tax deductions

const PROXY  = "https://claude-proxy.ckmuzza.workers.dev/";
const MODEL  = "claude-haiku-4-5-20251001";
const MAX_B64_BYTES = 4_000_000; // ~3MB file ≈ 4MB base64 — stay under Anthropic's limit

const PROMPT = `You are an Australian tax assistant. Extract ALL individual line items from this receipt or document as separate deductions.

Return ONLY a valid JSON array — no explanation, no markdown:
[
  {
    "merchant": "business/store name",
    "date": "YYYY-MM-DD",
    "amount": 0.00,
    "gst": 0.00,
    "category": "work-related|vehicle-travel|home-office|phone-internet|self-education|donations|investment|other",
    "description": "item name and quantity, e.g. Printer paper A4 x2"
  }
]

Rules:
- Return ONE array entry per distinct line item on the receipt
- If the receipt has only one item, return an array with one entry
- amount = price of that individual line item (inc GST)
- gst = GST for that line item; if not shown per item, calculate as amount / 11
- date = the receipt date for all items
- merchant = the store/supplier name for all items
- Pick the most appropriate ATO category for each individual item
- Use null only if a field truly cannot be determined
- Do NOT return the receipt total as a line item`;

async function _callClaude(messages, apiKey) {
  let resp;
  try {
    resp = await fetch(PROXY, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages
      })
    });
  } catch (netErr) {
    // Network-level failure (no response at all)
    throw new Error(`Network error — check your internet connection or API key. (${netErr.message})`);
  }

  if (!resp.ok) {
    let detail = "";
    try { const j = await resp.json(); detail = j.error?.message || ""; } catch(_) {}
    throw new Error(`API error ${resp.status}${detail ? ": " + detail : ""}`);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text || "";
  // Try array first, then object (wrap single object in array)
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) return JSON.parse(arrMatch[0]);
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return [JSON.parse(objMatch[0])];
  throw new Error("No JSON in response");
}

// Compress image to max 1200px, JPEG quality 0.75.
// If result is still over MAX_B64_BYTES, halve dimensions once more.
async function _compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const compress = (maxPx, quality) => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else                { width  = Math.round(width  * maxPx / height); height = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        return canvas.toDataURL("image/jpeg", quality).split(",")[1];
      };

      URL.revokeObjectURL(url);

      let b64 = compress(1200, 0.75);
      if (b64.length > MAX_B64_BYTES) {
        // Still too big — compress harder
        b64 = compress(800, 0.65);
      }
      console.log(`[claude-scan] compressed to ~${(b64.length / 1024).toFixed(0)} KB base64`);
      resolve(b64);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function scanReceiptImage(file, apiKey) {
  let base64, mimeType;

  if (file.type === "application/pdf") {
    // PDFs: read raw — warn if large
    base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    if (base64.length > MAX_B64_BYTES) {
      throw new Error(`PDF is too large (${(base64.length / 1024 / 1024).toFixed(1)} MB). Try scanning a photo of the receipt instead.`);
    }
    mimeType = "application/pdf";
  } else {
    base64   = await _compressImage(file);
    mimeType = "image/jpeg";
  }

  return _callClaude([{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
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
