const API_KEY = "AIzaSyAkbeGxNJkxJcrf-yP13S64KB8z8jNoudM";
const TOPIC = process.env.NTFY_TOPIC;
const DAY = 24 * 60 * 60 * 1000;

const ITEMS = [
  { id: "small", name: "Malá karta",  limit: 6,  tag: "floppy_disk" },
  { id: "large", name: "Velká karta", limit: 12, tag: "minidisc" },
  { id: "eggs",  name: "Vajíčka",     limit: 28, tag: "egg" },
  { id: "meat",  name: "Maso",        limit: 3,  tag: "cut_of_meat" },
];

const url = `https://firestore.googleapis.com/v1/projects/odpocty-html/databases/(default)/documents/odpocty/stav?key=${API_KEY}`;
const res = await fetch(url);
if (!res.ok) throw new Error("Firestore: " + res.status + " " + (await res.text()));
const fields = (await res.json()).fields ?? {};

const dny = n => (n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní");
const now = Date.now();
for (const item of ITEMS) {
  const v = fields[item.id];
  if (!v) continue;
  const start = Number(v.integerValue ?? v.doubleValue);
  const days = (now - start) / DAY;
  const warnAt = item.limit * 0.9;

  let msg = null, priority = "default";
  if (days >= item.limit) {
    const over = Math.floor(days - item.limit);
    msg = over < 1
      ? `⛔ ${item.name}: limit ${item.limit} dní právě uplynul.`
      : `⛔ ${item.name}: limit ${item.limit} dní překročen o ${over} ${dny(over)}.`;
    priority = "high";          // připomíná se každý den, dokud nevynulujete
  } else if (days >= warnAt && days < warnAt + 1) {
    const left = Math.ceil(item.limit - days);
    msg = `⚠ ${item.name}: do limitu zbývá cca ${left} ${dny(left)}.`;
  }

  if (msg) {
    await fetch(`https://ntfy.sh/${TOPIC}`, {
      method: "POST",
      body: msg,
      headers: { Priority: priority, Tags: item.tag },
    });
    console.log("Odesláno:", msg);
  }
}
