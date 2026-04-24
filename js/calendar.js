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

  const tz     = "Australia/Sydney";
  const ds     = item.dueDate || new Date().toISOString().slice(0, 10);
  const allDay = !item.time;
  let start, end;

  if (allDay) {
    start = { date: ds };
    end   = { date: ds };
  } else {
    const durationMins = item.duration || 60;
    const [h, m] = item.time.split(":").map(Number);
    const endMins = h * 60 + m + durationMins;
    const endH    = String(Math.floor(endMins / 60) % 24).padStart(2, "0");
    const endM    = String(endMins % 60).padStart(2, "0");
    start = { dateTime: `${ds}T${item.time}:00`,          timeZone: tz };
    end   = { dateTime: `${ds}T${endH}:${endM}:00`,       timeZone: tz };
  }

  const resp = await gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: {
      summary:     item.title,
      description: item.notes || undefined,
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
