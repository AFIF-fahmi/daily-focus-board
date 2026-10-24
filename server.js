const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const VAULT = process.env.OBSIDIAN_VAULT || path.join(ROOT, "data");
const DATA_DIR = path.join(VAULT, "Dashboard");
const FILES = { tasks: "tasks.md", deadlines: "deadlines.md", schedule: "schedule.md", interests: "interests.md" };
const BACKGROUND_DIR = path.join(ROOT, "backgrounds");
const BACKGROUND_EXTENSIONS = new Map([
  [".jpg", "image"], [".jpeg", "image"], [".png", "image"], [".webp", "image"], [".gif", "image"],
  [".mp4", "video"], [".webm", "video"], [".mov", "video"],
]);
const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

async function readText(file) { return fs.readFile(path.join(DATA_DIR, file), "utf8"); }
function parseTasks(markdown) {
  return markdown.split(/\r?\n/).map(line => line.match(/^- \[([ xX])\]\s+(.+)$/)).filter(Boolean)
    .map(match => ({ text: match[2].trim(), done: match[1].toLowerCase() === "x" }));
}
function parseDeadlines(markdown) {
  return markdown.split(/\r?\n/).map(line => line.match(/^- (.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})$/)).filter(Boolean)
    .map(match => ({ text: match[1].trim(), date: match[2] }));
}
function parseSchedule(markdown) {
  const dayNumbers = { Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 0 };
  const lines = markdown.split(/\r?\n/);
  const schedules = [];
  let day;
  let current;
  const save = () => {
    if (!current || !current.time) return;
    const [time, end] = current.time.replace(/[–—]/g, "-").split(/\s*-\s*/);
    schedules.push({
      time, ...(end ? { end } : {}), text: [current.course, `Kelas ${current.classType || "normal"}`, current.lecturer, current.location].filter(Boolean).join(" — "),
      course: current.course, classType: current.classType, lecturer: current.lecturer, location: current.location,
      ...(day !== undefined ? { days: [day] } : {}),
    });
    current = null;
  };
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) { save(); day = dayNumbers[heading[1].trim()]; continue; }
    const course = line.match(/^###\s+(.+)$/);
    if (course) { save(); current = { course: course[1].trim() }; continue; }
    const field = line.match(/^- (kelas|dosen|waktu|lokasi):\s*(.+)$/i);
    if (field && current) current[{ kelas: "classType", dosen: "lecturer", waktu: "time", lokasi: "location" }[field[1].toLowerCase()]] = field[2].trim();
    const legacy = line.replace(/[–—]/g, "-").match(/^- (\d{2}:\d{2})(?:\s*-\s*(\d{2}:\d{2}))?\s*\|\s*(.+?)(?:\s*\|\s*days=([0-6,]+))?$/);
    if (legacy) {
      const [time, end] = [legacy[1], legacy[2]];
      const parts = legacy[3].split(/\s+—\s+/);
      schedules.push({
        time, ...(end ? { end } : {}), text: legacy[3].trim(),
        ...(parts.length === 4 ? { course: parts[0], classType: parts[1].replace(/^Kelas\s+/i, ""), lecturer: parts[2], location: parts[3] } : {}),
        ...(legacy[4] ? { days: legacy[4].split(",").map(Number) } : {}),
      });
    }
  }
  save();
  return schedules;
}
function parseInterests(markdown) {
  const interests = [];
  let current;
  const save = () => {
    if (current?.text) interests.push(current);
    current = null;
  };
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^\s*#{1,6}\s+(.+?)\s*$/);
    if (heading) { save(); current = { text: heading[1].trim() }; continue; }
    const field = line.match(/^\s*-\s+(.+?)\s*$/);
    if (field && current) {
      const value = field[1].trim().replace(/^`|`$/g, "");
      if (/^tag:\s*/i.test(value)) current.tag = value.replace(/^tag:\s*/i, "").trim();
      else if (value.startsWith("#") && !/^#[\da-f]{3,8}$/i.test(value)) current.tag = value;
      else if (/^(?:#[\da-f]{3,8}|[a-z]+)$/i.test(value)) current.color = value;
      continue;
    }
    const legacy = line.match(/^\s*-\s+(.+?)(?:\s*\|\s*tag=(.+))?\s*$/);
    if (legacy) interests.push({ text: legacy[1].trim(), ...(legacy[2] ? { tag: legacy[2].trim() } : {}) });
  }
  save();
  return interests;
}
function serializeTasks(tasks) {
  return `# Tasks\n\n${tasks.map(item => `- [${item.done ? "x" : " "}] ${item.text}`).join("\n")}\n`;
}
function appendLine(type, item) {
  const lines = {
    tasks: `- [ ] ${item.text}`,
    deadlines: `- ${item.text} | ${item.date}`,
    schedule: `- ${item.time} | ${item.text}${item.days ? ` | days=${item.days}` : ""}`,
    interests: `# ${item.text}\n${item.tag ? `- ${item.tag}\n` : ""}`,
  };
  if (!lines[type]) throw new Error("Jenis quick add tidak didukung");
  return `${lines[type]}\n`;
}
async function readDashboard() {
  const [tasks, deadlines, schedule, interests] = await Promise.all(Object.values(FILES).map(readText));
  return { tasks: parseTasks(tasks), deadlines: parseDeadlines(deadlines), schedule: parseSchedule(schedule), interests: parseInterests(interests) };
}
async function readBackgrounds() {
  await fs.mkdir(BACKGROUND_DIR, { recursive: true });
  const files = await fs.readdir(BACKGROUND_DIR, { withFileTypes: true });
  return files.filter(file => file.isFile() && BACKGROUND_EXTENSIONS.has(path.extname(file.name).toLowerCase()))
    .map(file => ({ name: file.name, type: BACKGROUND_EXTENSIONS.get(path.extname(file.name).toLowerCase()), url: `/backgrounds/${encodeURIComponent(file.name)}` }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}
async function readBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  try { return JSON.parse(body || "{}"); } catch { throw new Error("Request body harus JSON yang valid"); }
}
async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/dashboard") {
    response.writeHead(200, headers); response.end(JSON.stringify(await readDashboard())); return true;
  }
  if (request.method === "GET" && pathname === "/api/backgrounds") {
    response.writeHead(200, headers); response.end(JSON.stringify(await readBackgrounds())); return true;
  }
  if (request.method === "PUT" && pathname === "/api/tasks") {
    const body = await readBody(request);
    if (!Array.isArray(body.tasks)) throw new Error("tasks harus berupa array");
    await fs.writeFile(path.join(DATA_DIR, FILES.tasks), serializeTasks(body.tasks), "utf8");
    response.writeHead(204); response.end(); return true;
  }
  const addMatch = pathname.match(/^\/api\/(tasks|deadlines|schedule|interests)$/);
  if (request.method === "POST" && addMatch) {
    const type = addMatch[1];
    const body = await readBody(request);
    if (!body.text || typeof body.text !== "string") throw new Error("text wajib diisi");
    if (type === "deadlines" && !/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) throw new Error("date harus berformat YYYY-MM-DD");
    if (type === "schedule" && !/^\d{2}:\d{2}$/.test(body.time || "")) throw new Error("time harus berformat HH:MM");
    await fs.appendFile(path.join(DATA_DIR, FILES[type]), appendLine(type, body), "utf8");
    response.writeHead(204); response.end(); return true;
  }
  return false;
}
async function serveStatic(response, pathname) {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const file = path.resolve(ROOT, relative);
  if (!file.startsWith(ROOT + path.sep)) throw new Error("Akses file tidak diizinkan");
  const content = await fs.readFile(file);
  const types = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
    ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  };
  response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }); response.end(content);
}
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (await handleApi(request, response, url.pathname)) return;
    if (request.method !== "GET") throw new Error("Method tidak didukung");
    await serveStatic(response, url.pathname);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 400, headers); response.end(JSON.stringify({ error: error.message }));
  }
});
async function start() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await Promise.all(Object.values(FILES).map(file => fs.writeFile(path.join(DATA_DIR, file), "", { flag: "a" })));
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Dashboard: http://127.0.0.1:${PORT}`);
    console.log(`Obsidian vault: ${VAULT}`);
  });
}
start().catch(error => { console.error(`Gagal menjalankan server: ${error.message}`); process.exitCode = 1; });