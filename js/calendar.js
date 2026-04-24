// Google Calendar API — OAuth consent + push events
let _gapiReady   = false;
let _tokenClient = null;

export async function initCalendar() {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      gapi.load("client", async () => {
        await gapi.client.init({
          apiKey:      GAPI_CONFIG.apiKey,
          discoveryDocs: [GAPI_CONFIG.discoveryDoc]
        });
        _gapiReady = true;

        // Load GIS token client
        _tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GAPI_CONFIG.clientId,
          scope:     GAPI_CONFIG.scopes,
          callback:  () => {}
        });
        resolve();
      });
    };
    document.head.appendChild(script);

    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    document.head.appendChild(gisScript);
  });
}

// Request calendar access (shows Google consent dialog if needed).
export function connectCalendar() {
  return new Promise((resolve, reject) => {
    if (!_tokenClient) { reject(new Error("GAPI not initialised")); return; }
    _tokenClient.callback = (resp) => {
      if (resp.error) reject(resp);
      else resolve(resp);
    };
    _tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export async function pushToCalendar(item) {
  if (!_gapiReady) await initCalendar();

  // Ensure we have a token (silent request first, then prompt)
  try {
    _tokenClient.callback = () => {};
    await new Promise((res, rej) => {
      _tokenClient.callback = (r) => r.error ? rej(r) : res(r);
      _tokenClient.requestAccessToken({ prompt: "" });
    });
  } catch {
    await connectCalendar();
  }

  const start = item.dueDate
    ? { date: item.dueDate }
    : { dateTime: new Date().toISOString(), timeZone: "Australia/Sydney" };

  const event = {
    summary:     item.title,
    description: [
      item.notes || "",
      `Type: ${item.type}`,
      `Quadrant: ${_quadrantLabel(item.quadrant)}`
    ].filter(Boolean).join("\n"),
    start,
    end: item.dueDate ? { date: item.dueDate } : { dateTime: new Date(Date.now() + 3600000).toISOString(), timeZone: "Australia/Sydney" }
  };

  const resp = await gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource:   event
  });

  if (resp.status === 200) {
    window._showToast?.(`"${item.title}" added to Google Calendar`, "success");
  }
  return resp;
}

function _quadrantLabel(q) {
  return { ui: "This Month", ni: "This Year", un: "One Day", nn: "Maybe Never" }[q] || q;
}
