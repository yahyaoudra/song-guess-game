const fs = require("fs");

const resolved = JSON.parse(fs.readFileSync("resolved_moroccan_songs.json", "utf8"));

// Add Arabic translations and rich Moroccan metadata
const arabicMeta = {
  "toto-mghayer": { titleArabic: "مغاير", artistArabic: "إل غراندي طوطو" },
  "toto-salina": { titleArabic: "سالينا", artistArabic: "إل غراندي طوطو" },
  "toto-dellali": { titleArabic: "دلالي", artistArabic: "إل غراندي طوطو وحمزة" },
  "toto-silhouette": { titleArabic: "سيلويت", artistArabic: "إل غراندي طوطو" },
  "toto-darbeda": { titleArabic: "داربيضا", artistArabic: "إل غراندي طوطو وديزي دروس" },
  "dizzy-m3a-l3essba": { titleArabic: "مع العصبة", artistArabic: "ديزي دروس" },
  "dizzy-nota": { titleArabic: "نوطة", artistArabic: "ديزي دروس" },
  "dizzy-moul-ballon": { titleArabic: "مول البالون", artistArabic: "ديزي دروس" },
  "dizzy-cazafonia": { titleArabic: "كازافونيا", artistArabic: "ديزي دروس" },
  "dizzy-chouf-chouf": { titleArabic: "شوف شوف", artistArabic: "ديزي دروس" },
  "stormy-nikey": { titleArabic: "نايكي", artistArabic: "ستورمي وديزي دروس" },
  "stormy-africano": { titleArabic: "أفريكانو", artistArabic: "ستورمي" },
  "stormy-maghribi": { titleArabic: "مغربي", artistArabic: "ستورمي" },
  "manal-taj": { titleArabic: "تاج", artistArabic: "منال بنشليخة" },
  "manal-slay": { titleArabic: "سلاي", artistArabic: "منال وطوطو" },
  "manal-3ari": { titleArabic: "عاري", artistArabic: "منال بنشليخة" },
  "manal-call-me": { titleArabic: "كول مي", artistArabic: "منال بنشليخة" },
  "manal-makhelaw-magalo": { titleArabic: "ماخلاو ماقالو", artistArabic: "منال بنشليخة" },
  "khtek-kickoff": { titleArabic: "كيك أوف", artistArabic: "ختك" },
  "kouz1-magic": { titleArabic: "ماجيك", artistArabic: "كوزوان" },
  "kouz1-love": { titleArabic: "لوف", artistArabic: "كوزوان" },
  "kouz1-brave": { titleArabic: "براف", artistArabic: "كوزوان" },
  "kouz1-jupter": { titleArabic: "جوبتر", artistArabic: "كوزوان" },
  "snor-de9a-de9a": { titleArabic: "دقة دقة", artistArabic: "سنور" },
  "snor-hkaya": { titleArabic: "حكاية", artistArabic: "سنور" },
  "snor-dawkheni": { titleArabic: "دوخني", artistArabic: "سنور" },
  "tagne-fratello": { titleArabic: "فراتيلو", artistArabic: "طاني" },
  "tagne-flouka": { titleArabic: "فلوكة", artistArabic: "طاني" },
  "tagne-youm-wara-youm": { titleArabic: "يوم ورا يوم", artistArabic: "طاني" },
  "dollypran-trax": { titleArabic: "تراكس", artistArabic: "دوليبران" },
  "smallx-liyana": { titleArabic: "ليانا", artistArabic: "سمول إكس" },
  "muslim-al-rissala": { titleArabic: "الرسالة", artistArabic: "مسلم" },
  "muslim-domi": { titleArabic: "دموع الحومة", artistArabic: "مسلم" },
  "muslim-kabous": { titleArabic: "كابوس", artistArabic: "مسلم" },
  "don-bigg-17": { titleArabic: "17", artistArabic: "دون بيغ" },
  "don-bigg-maghrabi": { titleArabic: "مغاربة تالموت", artistArabic: "دون بيغ" },

  "saad-lm3allem": { titleArabic: "لمعلم", artistArabic: "سعد لمجرد" },
  "saad-ghaltana": { titleArabic: "غلطانة", artistArabic: "سعد لمجرد" },
  "saad-enty": { titleArabic: "إنتي باغية واحد", artistArabic: "سعد لمجرد وديجي فان" },
  "saad-casablanca": { titleArabic: "كازابلانكا", artistArabic: "سعد لمجرد" },
  "saad-ghazali": { titleArabic: "غزالي غزالي", artistArabic: "سعد لمجرد" },
  "hatim-hasdouna": { titleArabic: "حسدونا", artistArabic: "حاتم عمور" },
  "hatim-bla-3onwan": { titleArabic: "بلا عنوان", artistArabic: "حاتم عمور" },
  "hatim-yama": { titleArabic: "ياما", artistArabic: "حاتم عمور" },
  "hatim-alawal": { titleArabic: "الأول", artistArabic: "حاتم عمور" },
  "zouhair-decapotable": { titleArabic: "ديكابوطابل", artistArabic: "زهير البهاوي" },
  "zouhair-mucho-amor": { titleArabic: "موتشو أمور", artistArabic: "زهير البهاوي" },
  "zouhair-bghit-w-ga3ma-hassit": { titleArabic: "بغيت وكاعما حسيت", artistArabic: "زهير البهاوي" },
  "salma-rachid-sma3ni": { titleArabic: "سمعني نبكيك", artistArabic: "سلمى رشيد" },
  "asma-lmnawar-ando-zin": { titleArabic: "عندو الزين", artistArabic: "أسماء المنور" },
  "asma-safi": { titleArabic: "صافي", artistArabic: "أسماء المنور" },
  "douzi-mina": { titleArabic: "مينا", artistArabic: "الدوزي" },
  "douzi-bikhtissar": { titleArabic: "باختصار", artistArabic: "الدوزي" },
  "ahmed-chawki-kayna-wla": { titleArabic: "كاينة ولا ماكيناش", artistArabic: "أحمد شوقي" },
  "ahmed-chawki-habibi": { titleArabic: "حبيبي آي لوف يو", artistArabic: "أحمد شوقي وبيتبول" },

  "najat-kedba": { titleArabic: "كذبة باينة", artistArabic: "نجاة عتابو" },
  "najat-j-en-ai-marre": { titleArabic: "جوني مار", artistArabic: "نجاة عتابو" },
  "najat-choufi-ghirou": { titleArabic: "شوفي غيرو", artistArabic: "نجاة عتابو" },
  "daoudi-3tini-saki": { titleArabic: "باغي نعمر راسي", artistArabic: "عبد الله الداودي" },
  "daoudi-aita": { titleArabic: "عيطة داودية", artistArabic: "عبد الله الداودي" },
  "statia-hwa-dani": { titleArabic: "هو داني", artistArabic: "الستاتية" },
  "senhaji-kheddouj": { titleArabic: "خدوج", artistArabic: "سعيد الصنهاجي" },
  "senhaji-zid-dardeg": { titleArabic: "زيد دردك عاود دردك", artistArabic: "سعيد الصنهاجي" },
  "abdelaziz-stati-visa": { titleArabic: "فيزا وباسبور", artistArabic: "عبد العزيز الستاتي" },
  "abdelaziz-stati-zwina": { titleArabic: "الزينة و كتعجبك راسك", artistArabic: "عبد العزيز الستاتي" },

  "khaled-didi": { titleArabic: "ديدي", artistArabic: "الشاب خالد" },
  "khaled-aicha": { titleArabic: "عائشة", artistArabic: "الشاب خالد" },
  "khaled-cest-la-vie": { titleArabic: "سي لا في", artistArabic: "الشاب خالد" },
  "mami-layali": { titleArabic: "ليالي", artistArabic: "الشاب مامي" },
  "hasni-choufou-3ch9i": { titleArabic: "شوفو عشقي", artistArabic: "الشاب حسني" },

  "hamid-el-kasri-lalla-aicha": { titleArabic: "لالة عائشة", artistArabic: "المعلم حميد القصري" },
  "hamid-el-kasri-youmala": { titleArabic: "يومالا", artistArabic: "المعلم حميد القصري" },
  "hamid-el-kasri-mira": { titleArabic: "لالة ميرة", artistArabic: "المعلم حميد القصري" },

  "nass-siniya": { titleArabic: "الصينية", artistArabic: "ناس الغيوان" },
  "nass-mahmouma": { titleArabic: "مهمومة يا خيي", artistArabic: "ناس الغيوان" },
  "nass-allah-ya-moulana": { titleArabic: "الله يا مولانا", artistArabic: "ناس الغيوان" },
  "jil-laayoune": { titleArabic: "العيون عينيا", artistArabic: "جيل جيلالة" },
  "jil-chamaa": { titleArabic: "الشمعة", artistArabic: "جيل جيلالة" },
  "lemchaheb-daouini": { titleArabic: "داويني", artistArabic: "لمشاهب" },
  "rouicha-inas-inas": { titleArabic: "إيناس إيناس", artistArabic: "محمد رويشة" },
  "rouicha-chhal-men-lila": { titleArabic: "شحال من ليلة", artistArabic: "محمد رويشة" },
  "amarg-fusion-arwah": { titleArabic: "أرواح", artistArabic: "أمارغ فيوجن" }
};

const finalSongs = resolved.map(s => {
  const meta = arabicMeta[s.id] || {};
  return {
    ...s,
    titleArabic: meta.titleArabic || s.title,
    artistArabic: meta.artistArabic || s.artist,
    appleMusicUrl: `https://music.apple.com/search?term=${encodeURIComponent(s.title + " " + s.artist)}`
  };
});

const tsContent = `import { Difficulty, MoroccanSong, SnippetTier } from '../types';

export const MOROCCAN_SONGS: MoroccanSong[] = ${JSON.stringify(finalSongs, null, 2)};

export const SNIPPET_TIERS: SnippetTier[] = [
  { step: 1, durationSec: 0.1, label: "0.1s", color: "from-emerald-400 to-green-500", points: 1000 },
  { step: 2, durationSec: 0.5, label: "0.5s", color: "from-teal-400 to-emerald-600", points: 750 },
  { step: 3, durationSec: 1.0, label: "1.0s", color: "from-amber-400 to-yellow-500", points: 500 },
  { step: 4, durationSec: 2.0, label: "2.0s", color: "from-orange-500 to-amber-600", points: 350 },
  { step: 5, durationSec: 4.0, label: "4.0s", color: "from-rose-500 to-red-600", points: 200 },
  { step: 6, durationSec: 7.0, label: "7.0s", color: "from-purple-600 to-indigo-600", points: 100 }
];

export const DIFFICULTY_COLORS: Record<Difficulty, { accent: string; glow: string; text: string; bg: string }> = {
  EASY: {
    accent: '#00e676',
    glow: 'rgba(0, 230, 118, 0.35)',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30'
  },
  MEDIUM: {
    accent: '#ffd600',
    glow: 'rgba(255, 214, 0, 0.35)',
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/15 border-yellow-500/30'
  },
  HARD: {
    accent: '#ff9100',
    glow: 'rgba(255, 145, 0, 0.35)',
    text: 'text-orange-400',
    bg: 'bg-orange-500/15 border-orange-500/30'
  },
  EXPERT: {
    accent: '#ff5252',
    glow: 'rgba(255, 82, 82, 0.35)',
    text: 'text-red-400',
    bg: 'bg-red-500/15 border-red-500/30'
  },
  IMPOSSIBLE: {
    accent: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.35)',
    text: 'text-purple-400',
    bg: 'bg-purple-500/15 border-purple-500/30'
  }
};
`;

fs.writeFileSync("src/data/moroccanSongs.ts", tsContent);
console.log("Updated src/data/moroccanSongs.ts successfully with", finalSongs.length, "songs!");
