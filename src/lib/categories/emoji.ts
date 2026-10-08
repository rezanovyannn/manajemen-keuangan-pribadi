// Emoji untuk chip kategori di Catat kilat (dekorasi; nama kategori tetap tertulis).
const EMOJI: Record<string, string> = {
  "makan & minum": "🍜",
  transportasi: "🛵",
  belanja: "🛍️",
  tagihan: "🧾",
  kesehatan: "💊",
  hiburan: "🎬",
  pendidikan: "📚",
  "cicilan & utang": "💳",
  "biaya admin": "🏦",
  gaji: "💼",
  bonus: "🎁",
  hadiah: "🎀",
  "pelunasan piutang": "🤝",
  lainnya: "✨",
};

// Kata kunci untuk kategori buatan pengguna.
const KATA: [RegExp, string][] = [
  [/kopi|cafe|kafe|ngopi/, "☕"],
  [/makan|food|jajan|snack/, "🍜"],
  [/bensin|bbm|parkir|tol|ojek|grab|gojek|transport/, "🛵"],
  [/pulsa|data|internet|wifi/, "📶"],
  [/listrik|pln|air|pdam/, "💡"],
  [/sewa|kos|kontrakan|rumah/, "🏠"],
  [/game|top ?up/, "🎮"],
  [/olahraga|gym|fitness/, "🏋️"],
  [/pacar|date|kencan/, "💕"],
  [/skincare|kecantikan|salon|potong/, "💅"],
  [/investasi|saham|reksa|emas|crypto/, "📈"],
  [/zakat|sedekah|donasi|amal/, "🤲"],
  [/hewan|kucing|anjing|pet/, "🐾"],
];

export function categoryEmoji(name: string): string {
  const n = name.trim().toLowerCase();
  if (EMOJI[n]) return EMOJI[n];
  return KATA.find(([re]) => re.test(n))?.[1] ?? "•";
}
