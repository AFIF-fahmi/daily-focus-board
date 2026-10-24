const NAME = "Arctic";

let TASKS = [
  "Kerjakan tugas kuliah yang paling dekat deadline",
  "Belajar / review materi 30 menit",
  "Progres proyek game (1 hal kecil saja)",
  "Rapikan catatan untuk besok",
];

let SCHEDULE = [
  { time: "07:00", text: "Bangun & siap-siap" },
  { time: "08:00", text: "Kuliah / kelas", days: [1,2,3,4,5] },
  { time: "13:00", text: "Makan siang & istirahat" },
  { time: "15:00", text: "Blok tugas (fokus, tanpa game)" },
  { time: "17:30", text: "Olahraga / jalan sebentar" },
  { time: "19:00", text: "Waktu proyek pribadi" },
  { time: "21:00", text: "Waktu bebas: game / fan art" },
  { time: "23:00", text: "Tidur" },
];

let INTERESTS = [
  { text: "Fan art / desain", tag: "kreatif" },
  { text: "Main game", tag: "santai" },
  { text: "Eksperimen Godot", tag: "coding" },
  { text: "Utak-atik server", tag: "tech" },
];

let DEADLINES = [
  { text: "Contoh: Tugas Kewarganegaraan", date: "2026-10-29" },
  { text: "Contoh: Ujian tengah semester", date: "2026-11-10" },
];

const FOCUS_MIN = 25;
const BREAK_MIN = 5;
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const store = {
  get(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
  },
  set(k, value) {
    try { localStorage.setItem(k, JSON.stringify(value)); } catch {}
  },
};

const defaultAccent = { primary: [117, 217, 255], secondary: [169, 145, 255] };
function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
}
function setAccentVariables(primary, secondary) {
  document.documentElement.style.setProperty("--accent", `rgb(${primary.join(", ")})`);
  document.documentElement.style.setProperty("--accent2", `rgb(${secondary.join(", ")})`);
  document.documentElement.style.setProperty("--accent-rgb", primary.join(", "));
  document.documentElement.style.setProperty("--accent2-rgb", secondary.join(", "));
}

let taskState = [];
let dashboardSnapshot = "";
function setConnectionStatus(message, state = "") {
  const element = $("connectionStatus");
  element.querySelector(".status-label").textContent = message;
  element.className = state;
}

function setupInteractionLock() {
  const button = $("interactionLock");
  let locked = false;
  button.onclick = () => {
    locked = !locked;
    document.body.classList.toggle("interaction-locked", locked);
    button.title = locked ? "Buka kunci semua interaksi" : "Kunci semua interaksi";
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", String(locked));
  };
}

function setupPageRefresh() {
  $("pageRefresh").onclick = () => window.location.reload();
}

function setupWallpaperMode() {
  const button = $("wallpaperMode");
  const panel = $("opacityPanel");
  const modes = ["normal", "semi", "full"];
  const labels = { normal: "Normal", semi: "Semi", full: "Full" };
  const presets = {
    normal: { window: 100, greeting: 100, control: 100 },
    semi: { window: 38, greeting: 38, control: 100 },
    full: { window: 0, greeting: 0, control: 100 },
  };
  let current = "normal";
  const sliders = [...document.querySelectorAll("#windowOpacity, #greetingOpacity, #controlOpacity")];
  const windowColor = $("windowColor");
  const accentColor = $("accentColor");
  const windowBlur = $("windowBlur");
  const savedWindowColor = store.get("daily-focus-board-window-color", "#111930");
  const savedAccentColor = store.get("daily-focus-board-accent-color", null);
  const savedWindowBlur = store.get("daily-focus-board-window-blur", 18);
  windowColor.value = savedWindowColor;
  windowBlur.value = String(savedWindowBlur);
  document.documentElement.style.setProperty("--card-primary", savedWindowColor);
  document.documentElement.style.setProperty("--window-blur", `${savedWindowBlur}px`);
  if (savedAccentColor) {
    accentColor.value = savedAccentColor;
    setAccentVariables(hexToRgb(savedAccentColor), [169, 145, 255]);
  }

  function updateOpacityControl(input) {
    const value = Number(input.value) / 100;
    const target = input.id.replace("Opacity", "");
    document.documentElement.style.setProperty(`--${target}-opacity`, String(value));
    $(`${input.id}Value`).textContent = `${input.value}%`;
  }

  function applyPreset(mode) {
    sliders.forEach(input => {
      const key = input.id.replace("Opacity", "");
      input.value = String(presets[mode][key]);
      updateOpacityControl(input);
    });
  }

  function chooseMode(event) {
    const nextMode = event.currentTarget.dataset.wallpaperMode;
    current = nextMode;
    applyPreset(current);
    document.body.classList.remove("wallpaper-semi", "wallpaper-full");
    if (current !== "normal") document.body.classList.add(`wallpaper-${current}`);
    button.title = `Mode wallpaper: ${labels[current]}`;
    document.querySelectorAll("[data-wallpaper-mode]").forEach(item => item.classList.toggle("is-selected", item.dataset.wallpaperMode === current));
  }
  document.querySelector('[data-wallpaper-mode="normal"]').classList.add("is-selected");
  button.onclick = () => {
    panel.classList.toggle("is-open");
    panel.setAttribute("aria-hidden", String(!panel.classList.contains("is-open")));
  };
  $("opacityClose").onclick = () => {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  };
  document.addEventListener("click", event => {
    if (panel.classList.contains("is-open") && !panel.contains(event.target) && event.target !== button) {
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
    }
  });
  document.querySelectorAll("[data-wallpaper-mode]").forEach(item => item.onclick = chooseMode);
  sliders.forEach(input => input.oninput = () => updateOpacityControl(input));
  windowColor.oninput = () => {
    document.documentElement.style.setProperty("--card-primary", windowColor.value);
    store.set("daily-focus-board-window-color", windowColor.value);
  };
  windowBlur.oninput = () => {
    document.documentElement.style.setProperty("--window-blur", `${windowBlur.value}px`);
    $("windowBlurValue").textContent = `${windowBlur.value}px`;
    store.set("daily-focus-board-window-blur", Number(windowBlur.value));
  };
  accentColor.oninput = () => {
    store.set("daily-focus-board-accent-color", accentColor.value);
    setAccentVariables(hexToRgb(accentColor.value), [169, 145, 255]);
  };
  $("resetColors").onclick = () => {
    windowColor.value = "#111930";
    accentColor.value = "#75d9ff";
    document.documentElement.style.setProperty("--card-primary", "#111930");
    store.set("daily-focus-board-window-color", "#111930");
    store.set("daily-focus-board-accent-color", "#75d9ff");
    setAccentVariables(defaultAccent.primary, defaultAccent.secondary);
  };
  $("autoColors").onclick = () => {
    store.set("daily-focus-board-accent-color", null);
    accentColor.value = "#75d9ff";
    window.location.reload();
  };
  applyPreset("normal");
  windowBlur.oninput();
}

async function setupBackgrounds() {
  const wallpaperKey = "daily-focus-board-wallpaper";
  const toggle = $("backgroundToggle");
  const panel = $("backgroundPanel");
  const itemsElement = $("backgroundItems");
  const layer = $("backgroundLayer");
  const autoButton = $("backgroundAuto");
  let backgrounds = [{ name: "Default", type: "default" }];
  let currentIndex = -1;
  let autoTimer = null;
  let transitionId = 0;

  function stopAuto() {
    clearInterval(autoTimer);
    autoTimer = null;
    autoButton.setAttribute("aria-pressed", "false");
    autoButton.textContent = "Auto foto";
  }

  function renderItems() {
    itemsElement.replaceChildren();
    backgrounds.forEach((background, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "background-item";
      button.title = background.name;
      if (index === currentIndex) button.classList.add("is-selected");
      if (background.type === "image") {
        const image = document.createElement("img");
        image.src = background.url;
        image.alt = background.name;
        button.append(image);
      } else if (background.type === "default") {
        button.textContent = "AURORA";
      } else {
        button.textContent = "VIDEO";
      }
      const label = document.createElement("span");
      label.textContent = background.name;
      button.append(label);
      button.onclick = () => showBackground(index);
      itemsElement.append(button);
    });
  }

  function setAccent(accent, accent2) {
    if (store.get("daily-focus-board-accent-color", null)) return;
    setAccentVariables(accent, accent2);
  }

  function sampleAccent(url, type, expectedIndex) {
    const media = type === "video" ? document.createElement("video") : new Image();
    media.muted = true;
    if (type === "video") media.preload = "auto";
    const sample = () => {
      if (expectedIndex !== currentIndex) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(media, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let red = 0; let green = 0; let blue = 0; let weightTotal = 0;
        for (let i = 0; i < pixels.length; i += 16) {
          const values = [pixels[i], pixels[i + 1], pixels[i + 2]];
          const maximum = Math.max(...values);
          const minimum = Math.min(...values);
          const weight = Math.max(1, maximum - minimum) * (maximum + 1);
          red += values[0] * weight;
          green += values[1] * weight;
          blue += values[2] * weight;
          weightTotal += weight;
        }
        const average = [red / weightTotal, green / weightTotal].concat(blue / weightTotal);
        const primary = average.map(value => Math.max(45, Math.min(255, Math.round(value))));
        const secondary = [primary[2], primary[0], primary[1]].map(value => Math.max(55, Math.min(255, Math.round(value * 1.08))));
        setAccent(primary, secondary);
      } catch (error) {
        console.warn("Warna accent background tidak dapat dibaca:", error);
      }
    };
    media.addEventListener(type === "video" ? "loadeddata" : "load", sample, { once: true });
    media.addEventListener("error", () => console.warn(`Media background gagal dimuat: ${url}`), { once: true });
    media.src = url;
    if (type === "video") media.load();
  }

  function showBackground(index, { keepAuto = false } = {}) {
    if (!backgrounds[index]) return;
    if (!keepAuto) stopAuto();
    currentIndex = index;
    const background = backgrounds[index];
    store.set(wallpaperKey, {
      name: background.name,
      type: background.type,
      ...(background.url ? { url: background.url } : {}),
    });
    document.body.classList.toggle("has-custom-background", background.type !== "default");
    if (background.type === "default") setAccent([117, 217, 255], [169, 145, 255]);
    else sampleAccent(background.url, background.type, index);
    renderItems();
    const currentTransition = ++transitionId;
    const applyBackground = () => {
      if (currentTransition !== transitionId) return;
      layer.replaceChildren();
      layer.style.backgroundImage = "none";
      if (background.type === "default") {
        layer.classList.remove("is-changing", "is-visible");
        return;
      }
      if (background.type === "video") {
        const video = document.createElement("video");
        video.src = background.url;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        layer.append(video);
      } else {
        layer.style.backgroundImage = `url("${background.url}")`;
      }
      layer.classList.remove("is-changing");
      requestAnimationFrame(() => layer.classList.add("is-visible"));
    };

    if (layer.classList.contains("is-visible")) {
      layer.classList.remove("is-visible");
      layer.classList.add("is-changing");
      window.setTimeout(applyBackground, 450);
    } else {
      applyBackground();
    }
  }

  function showNextPhoto() {
    const photos = backgrounds.map((item, index) => item.type === "image" ? index : -1).filter(index => index >= 0);
    if (!photos.length) return;
    const position = photos.indexOf(currentIndex);
    showBackground(photos[(position + 1) % photos.length], { keepAuto: true });
  }

  try {
    const response = await fetch("/api/backgrounds", { cache: "no-store" });
    if (!response.ok) throw new Error(`Background merespons ${response.status}`);
    backgrounds = [{ name: "Default", type: "default" }, ...(await response.json())];
    renderItems();
    const saved = store.get(wallpaperKey, null);
    const savedIndex = saved
      ? backgrounds.findIndex(background =>
        background.type === saved.type && (background.url ? background.url === saved.url : background.name === saved.name)
      )
      : -1;
    showBackground(savedIndex >= 0 ? savedIndex : 0);
  } catch (error) {
    console.error("Gagal memuat background:", error);
  }

  function toggleBackgroundPanel(open) {
    const nextOpen = open ?? !panel.classList.contains("is-open");
    panel.classList.toggle("is-open", nextOpen);
    panel.setAttribute("aria-hidden", String(!nextOpen));
  }
  toggle.onclick = () => toggleBackgroundPanel();
  $("backgroundClose").onclick = () => toggleBackgroundPanel(false);
  document.addEventListener("click", event => {
    if (panel.classList.contains("is-open") && !panel.contains(event.target) && event.target !== toggle) toggleBackgroundPanel(false);
  });
  $("backgroundPrev").onclick = () => {
    const photos = backgrounds.map((item, index) => item.type === "image" ? index : -1).filter(index => index >= 0);
    if (photos.length) showBackground(photos[(photos.indexOf(currentIndex) - 1 + photos.length) % photos.length]);
  };
  $("backgroundNext").onclick = showNextPhoto;
  autoButton.onclick = () => {
    if (autoTimer) {
      stopAuto();
      return;
    }
    if (!backgrounds.some(item => item.type === "image")) return;
    autoButton.setAttribute("aria-pressed", "true");
    autoButton.textContent = "Auto aktif";
    autoTimer = setInterval(showNextPhoto, 30000);
  };
}

async function loadFromObsidian({ render = false, announce = true } = {}) {
  const response = await fetch("/api/dashboard", { cache: "no-store" });
  if (!response.ok) throw new Error(`Server Obsidian merespons ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.tasks) || !Array.isArray(data.deadlines) || !Array.isArray(data.schedule) || !Array.isArray(data.interests)) {
    throw new Error("Format data dashboard dari Obsidian tidak lengkap");
  }
  const nextSnapshot = JSON.stringify(data);
  const changed = nextSnapshot !== dashboardSnapshot;
  TASKS = data.tasks.map(item => item.text);
  taskState = data.tasks;
  DEADLINES = data.deadlines;
  SCHEDULE = data.schedule;
  INTERESTS = data.interests;
  dashboardSnapshot = nextSnapshot;
  if (render && changed) {
    renderTasks();
    renderInterests();
    renderDeadlines();
    renderSchedule();
  }
  if (announce) setConnectionStatus("Connected", "connected");
  return changed;
}
async function saveTasksToObsidian() {
  setConnectionStatus("Fetching...", "");
  const response = await fetch("/api/tasks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks: taskState }),
  });
  if (!response.ok) throw new Error(`Gagal menyimpan tasks.md (${response.status})`);
}

function setupLegacyWindows() {
  const minimizedWindows = $("minimizedWindows");
  const icons = {
    tasks: "✓",
    deadlines: "!",
    schedule: "☰",
    interests: "✦",
    pomo: "⏱",
  };

  [...workspace.querySelectorAll(".window-card")].forEach((card, cardIndex) => {
    const title = card.querySelector("h2").textContent;
    const tools = document.createElement("div");
    tools.className = "window-tools";
    tools.style.setProperty("--window-delay", `${cardIndex * 45}ms`);
    const addButton = ["tasks", "deadlines", "schedule", "interests"].includes(card.dataset.window)
      ? `<button class="window-add" type="button" aria-label="Tambah ke ${title}" title="Quick add">+</button>`
      : "";
    tools.innerHTML = `${addButton}<button class="window-size" type="button" aria-label="Ukuran normal" title="Ubah ukuran">□</button><button class="window-minimize" type="button" aria-label="Minimalkan ${title}" title="Minimalkan">−</button>`;
    card.appendChild(tools);

    tools.querySelector(".window-add")?.addEventListener("click", () => quickAdd(card.dataset.window));
    tools.querySelector(".window-minimize").onclick = event => {
      event.stopPropagation();
      card.classList.add("is-minimized");
      const icon = document.createElement("button");
      icon.className = "minimized-icon";
      icon.type = "button";
      icon.dataset.window = card.dataset.window;
      icon.textContent = icons[card.dataset.window] || "□";
      icon.title = `Tampilkan ${title}`;
      icon.setAttribute("aria-label", `Tampilkan ${title}`);
      icon.onclick = () => {
        card.classList.remove("is-minimized");
        icon.remove();
      };
      minimizedWindows.appendChild(icon);
    };

    const sizeButton = tools.querySelector(".window-size");
    sizeButton.onclick = event => {
      event.stopPropagation();
      const sizes = ["normal", "col", "row"];
      const current = card.dataset.size || "normal";
      const next = sizes[(sizes.indexOf(current) + 1) % sizes.length];
      card.classList.remove("span-col-2", "span-row-2");
      if (next === "col") card.classList.add("span-col-2");
      if (next === "row") card.classList.add("span-row-2");
      card.dataset.size = next;
      sizeButton.textContent = next === "col" ? "↔" : next === "row" ? "↕" : "□";
      sizeButton.setAttribute("aria-label", next === "col" ? "Ukuran 2 kolom" : next === "row" ? "Ukuran 2 baris" : "Ukuran normal");
      sizeButton.title = sizeButton.getAttribute("aria-label");
    };

  });
}

async function quickAdd(type) {
  const labels = {
    tasks: "Tugas baru",
    deadlines: "Nama deadline",
    schedule: "Kegiatan",
    interests: "Aktivitas atau interest",
  };
  const text = window.prompt(labels[type] || "Item baru");
  if (!text?.trim()) return;
  const item = { text: text.trim() };
  if (type === "deadlines") {
    item.date = window.prompt("Tanggal deadline (YYYY-MM-DD)", todayKey());
    if (!item.date) return;
  }
  if (type === "schedule") {
    item.time = window.prompt("Jam (HH:MM)", "08:00");
    if (!item.time) return;
    item.days = window.prompt("Hari (0=Min, 1=Sen, ..., 6=Sab), kosongkan untuk setiap hari", "");
  }
  if (type === "interests") item.tag = window.prompt("Tag (opsional)", "")?.trim();
  try {
    setConnectionStatus("Fetching...", "");
    const response = await fetch(`/api/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!response.ok) {
      let detail = "";
      try {
        const payload = await response.json();
        detail = payload.error ? `: ${payload.error}` : "";
      } catch {}
      throw new Error(`Gagal menambah ke ${type}.md${detail}`);
    }
    await loadFromObsidian({ render: true });
    setConnectionStatus("Connected", "connected");
  } catch (error) {
    setConnectionStatus("Can't Fetch", "error");
    console.error(error);
  }
}

function tick() {
  const d = new Date();
  $("clock").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  $("date").textContent = d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const h = d.getHours();
  const greeting = h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  const message = h < 6
    ? "Waktunya istirahat. Don't forget to rest and recharge."
    : h < 12
      ? "Waktunya kuliah. Still focused."
      : h < 18
        ? "Tetap semangat. Have a productive day."
        : "Waktunya gaming dan istirahat setelah semua selesai.";
  $("greet").innerHTML = `${greeting}, ${NAME}<small>${message}</small>`;
  renderSchedule();
}

function renderTasks() {
  $("tasks").innerHTML = "";
  TASKS.forEach((task, index) => {
    const element = document.createElement("div");
    const done = Boolean(taskState[index]?.done);
    element.className = "item" + (done ? " done" : "");
    element.innerHTML = `<div class="box">✓</div><div class="label">${task}</div>`;
    element.onclick = async () => {
      taskState[index].done = !taskState[index].done;
      renderTasks();
      try {
        await saveTasksToObsidian();
        setConnectionStatus("Connected", "connected");
      } catch (error) {
        taskState[index].done = !taskState[index].done;
        renderTasks();
        setConnectionStatus("Can't Fetch", "error");
        console.error(error);
      }
    };
    $("tasks").appendChild(element);
  });
  const doneCount = taskState.filter(item => item.done).length;
  $("taskBar").style.width = (doneCount / TASKS.length * 100) + "%";
}

function renderSchedule() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const day = now.getDay();
  const items = SCHEDULE
    .filter(schedule => !schedule.days || schedule.days.includes(day))
    .map(schedule => ({
      ...schedule,
      minutes: +schedule.time.slice(0, 2) * 60 + +schedule.time.slice(3),
      endMinutes: schedule.end ? +schedule.end.slice(0, 2) * 60 + +schedule.end.slice(3) : null,
    }))
    .sort((a, b) => a.minutes - b.minutes);
  const activeIndex = items.findIndex((schedule, index) => {
    const nextStart = items[index + 1]?.minutes ?? Infinity;
    const end = schedule.endMinutes ?? nextStart;
    return minutes >= schedule.minutes && minutes < end;
  });
  $("schedule").innerHTML = items.map((schedule, index) => {
    const className = index === activeIndex ? "now" : activeIndex >= 0 && index < activeIndex ? "past" : "";
    const timeLabel = schedule.end ? `${schedule.time}–${schedule.end}` : schedule.time;
    const [course, classType, lecturer, location] = schedule.course
      ? [schedule.course, `Kelas ${schedule.classType || "normal"}`, schedule.lecturer, schedule.location]
      : schedule.text.split(/\s+—\s+/);
    return `<div class="schedule-entry ${className}">
      <strong class="schedule-course">${course || schedule.text}</strong>
      <div class="schedule-detail"><i class="fa-solid fa-chalkboard-user" aria-hidden="true"></i><span>${classType || "Kelas"}</span></div>
      <div class="schedule-detail"><i class="fa-solid fa-user" aria-hidden="true"></i><span>${lecturer || "Dosen belum diisi"}</span></div>
      <div class="schedule-detail"><i class="fa-regular fa-clock" aria-hidden="true"></i><span>${timeLabel}</span></div>
      <div class="schedule-detail"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>${location || "Lokasi belum diisi"}</span></div>
    </div>`;
  }).join("");
}

function renderInterests() {
  $("interests").innerHTML = INTERESTS.map(interest =>
    `<div class="item interest-item" style="${interest.color ? `--interest-color:${interest.color}` : ""}"><div class="label">${interest.text}</div>${interest.tag ? `<span class="tag">${interest.tag}</span>` : ""}${interest.color ? `<span class="interest-color" aria-label="Warna ${interest.color}" title="${interest.color}"></span>` : ""}</div>`
  ).join("");
}

function renderDeadlines() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  $("deadlines").innerHTML = DEADLINES
    .map(deadline => ({ ...deadline, left: Math.round((new Date(deadline.date + "T00:00:00") - today) / 864e5) }))
    .filter(deadline => deadline.left >= 0)
    .sort((a, b) => a.left - b.left)
    .map(deadline => `<div class="dl ${deadline.left <= 3 ? "urgent" : ""}"><span>${deadline.text}</span><b>${deadline.left === 0 ? "Hari ini!" : deadline.left + " hari"}</b></div>`)
    .join("") || `<div class="dl"><span style="color:var(--muted)">Tidak ada deadline</span></div>`;
}

let mode = "focus";
let remain = FOCUS_MIN * 60;
let timer = null;

function drawPomo() {
  $("pomoTime").textContent = `${pad(Math.floor(remain / 60))}:${pad(remain % 60)}`;
  $("pomoMode").textContent = mode === "focus" ? "Fokus" : "Istirahat";
  $("pStart").textContent = timer ? "Jeda" : "Mulai";
}

function beep() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    gain.gain.value = 0.08;
    oscillator.frequency.value = 660;
    oscillator.start();
    setTimeout(() => { oscillator.stop(); context.close(); }, 500);
  } catch {}
}

function switchMode() {
  mode = mode === "focus" ? "break" : "focus";
  remain = (mode === "focus" ? FOCUS_MIN : BREAK_MIN) * 60;
  drawPomo();
}

$("pStart").onclick = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  } else {
    timer = setInterval(() => {
      if (--remain <= 0) {
        beep();
        switchMode();
      }
      drawPomo();
    }, 1000);
  }
  drawPomo();
};

$("pReset").onclick = () => {
  clearInterval(timer);
  timer = null;
  remain = (mode === "focus" ? FOCUS_MIN : BREAK_MIN) * 60;
  drawPomo();
};

$("pSkip").onclick = () => {
  clearInterval(timer);
  timer = null;
  switchMode();
};

async function init() {
  try {
    await loadFromObsidian();
  } catch (error) {
    setConnectionStatus("Can't Fetch", "error");
    console.error(error);
    taskState = TASKS.map(text => ({ text, done: false }));
  }
  renderTasks();
  renderInterests();
  renderDeadlines();
  window.setupWindows();
  setupInteractionLock();
  setupPageRefresh();
  setupWallpaperMode();
  setupBackgrounds();
  drawPomo();
  tick();
}
init();
setInterval(tick, 15000);
setInterval(renderDeadlines, 3600000);
setInterval(async () => {
  try {
    await loadFromObsidian({ render: true, announce: false });
  } catch (error) {
    setConnectionStatus("Can't Fetch", "error");
    console.error("Sinkronisasi Obsidian gagal:", error);
  }
}, 3000);
