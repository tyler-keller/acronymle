// Validate puzzles.js: node tools/check-puzzles.js
// Checks: acronym == initials of non-connector words, letters only, no duplicate acronyms,
// and prints the date the list runs out.
const fs = require("fs"), path = require("path"), vm = require("vm");
const src = fs.readFileSync(path.join(__dirname, "..", "puzzles.js"), "utf8");
const ctx = {}; vm.runInNewContext(src + "\nthis.PUZZLES = PUZZLES;", ctx);
const P = ctx.PUZZLES, seen = new Map(); let bad = 0;
P.forEach(([acro, exp, cat], i) => {
  const n = i + 1, err = (m) => { bad++; console.error(`#${n} ${acro}: ${m}`); };
  if (!/^[A-Z]+$/.test(acro)) err("acronym must be A-Z only");
  const words = exp.split(" ");
  if (words.some((w) => !/^~?[A-Za-z]+$/.test(w))) err(`non-letter in expansion "${exp}"`);
  const slots = words.filter((w) => !w.startsWith("~"));
  const initials = slots.map((w) => w[0].toUpperCase()).join("");
  if (initials !== acro) err(`initials ${initials} != ${acro}`);
  if (!cat || typeof cat !== "string") err("missing category");
  if (seen.has(acro)) err(`duplicate of #${seen.get(acro)}`); else seen.set(acro, n);
});
const end = new Date(2026, 9, 31); end.setDate(end.getDate() + P.length - 1);
console.log(`${P.length} puzzles, last daily puzzle ${end.toISOString().slice(0, 10)}${bad ? `, ${bad} ERRORS` : ", all valid"}`);
process.exit(bad ? 1 : 0);
