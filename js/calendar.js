// Google Calendar API — OAuth consent + push events
let _gapiReady   = false;
let _gisReady    = false;
let _tokenClient = null;

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function initCalendar() {
  if (_gapiReady && _gisReady) return;

  // Load both scripts concurrently then initialise in order
  await Promise.all([
    _loadScript("https://apis.google.com/js/api.js"),
    _loadScript("https://accounts.google.com/gsi/client")
  ]);

  // Initialise GAPI client
  await new Promise((resolve, reject) => {
    gapi.load("client", async () => {
      try {
        await gapi.client.init({
          apiKey:        GAPI_CONFIG.apiKey,
          discoveryDocs: [GAPI_CONFIG.discoveryDoc]
        });
        _gapiReady = true;
        resolve();
      } catch (e) { reject(e); }
    });
  });

  // Initialise GIS token client (google.accounts is now guaranteed loaded)
  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GAPI_CONFIG.clientId,
    scope:     GAPI_CONFIG.scopes,
    callback:  () => {}
  });
  _gisReady = true;
}

// Request calendar access — shows Google consent popup
export async function connectCalendar() {
  await initCalendar();
  return new Promise((resolve, reject) => {
    _tokenClient.callback = (resp) => {
      if (resp.error) reject(new Error(resp.error));
      else resolve(resp);
    };
    _tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export async function pushToCalendar(item) {
  await initCalendar();

  // Get a token — silent first, prompt if needed
  await new Promise((resolve, reject) => {
    _tokenClient.callback = (r) => r.error ? reject(r) : resolve(r);
    _tokenClient.requestAccessToken({ prompt: "" });
  }).catch(async () => {
    await connectCalendar();
  });

  const tz  = "Australia/Sydney";
  const allDay = !item.time || item.duration === 0;
  let start, end;

  if (allDay) {
    const ds = item.dueDate || new Date().toISOString().slice(0, 10);
    start = { date: ds };
    end   = { date: ds };
  } else {
    const ds      = item.dueDate || new Date().toISOString().slice(0, 10);
    const startDt = new Date(`${ds}T${item.time}:00`);
    const endDt   = new Date(startDt.getTime() + (item.duration || 60) * 60000);
    start = { dateTime: startDt.toISOString(), timeZone: tz };
    end   = { dateTime: endDt.toISOString(),   timeZone: tz };
  }

  const resp = await gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: {
      summary:     item.title,
      description: [item.notes, item.location ? `📍 ${item.location}` : ""].filter(Boolean).join("\n"),
      location:    item.location || undefined,
      start,
      end
    }
  });

  if (resp.status === 200) {
    window._showToast?.(`"${item.title}" added to Google Calendar`, "success");
  }
  return resp;
}
