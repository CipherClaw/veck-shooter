const BAD_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "nigger",
  "faggot",
  "retard",
  "kike",
  "chink",
  "spic",
  "whore",
  "slut"
];

export function cleanText(text: string, max = 160): string {
  const squashed = text.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  return BAD_WORDS.reduce((value, word) => {
    const rx = new RegExp(word.split("").join("[\\W_]*"), "gi");
    return value.replace(rx, "*".repeat(Math.min(word.length, 6)));
  }, squashed);
}

export function validateName(input: string): { ok: true; name: string } | { ok: false; reason: string } {
  const name = cleanText(input, 18).replace(/[^a-zA-Z0-9 _.-]/g, "").trim();
  if (name.length < 3 || name.length > 18) return { ok: false, reason: "Name must be 3-18 characters." };
  if (name.includes("*")) return { ok: false, reason: "Choose a name without abusive language." };
  return { ok: true, name };
}
