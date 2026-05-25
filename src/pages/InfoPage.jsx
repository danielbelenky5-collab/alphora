import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import TopBar from '../components/layout/TopBar'

// ── Colors ────────────────────────────────────────────────────────────────────
const UP   = '#26a65b'
const DOWN = '#e53935'
const NEU  = '#8b949e'
const BLU  = '#3b6ff5'
const ORAN = '#f59e0b'
const PURP = '#8b5cf6'
const TEAL = '#06b6d4'

// ── SVG Candle Primitives ─────────────────────────────────────────────────────
function SvgCandle({ cx, tw, bt, bb, bw, bull, neutral = false, clr }) {
  const c = clr || (neutral ? NEU : bull ? UP : DOWN)
  const W = 13
  return (
    <g>
      <line x1={cx} y1={tw} x2={cx} y2={bt} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      <rect x={cx - W / 2} y={bt} width={W} height={Math.max(2, bb - bt)} fill={c} rx={1.5} />
      <line x1={cx} y1={bb} x2={cx} y2={bw} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  )
}
function SvgDoji({ cx, tw, my, bw, clr = NEU }) {
  return (
    <g>
      <line x1={cx} y1={tw} x2={cx} y2={my - 1} stroke={clr} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={cx - 9} y1={my} x2={cx + 9} y2={my} stroke={clr} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={cx} y1={my + 1} x2={cx} y2={bw} stroke={clr} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  )
}

// ── CANDLESTICK PATTERNS ──────────────────────────────────────────────────────
const PATTERNS = [
  // ─────────────────────────────────────────────────────── BULLISH ──────────
  {
    id:'hammer', nameHe:'פטיש', nameEn:'Hammer', type:'bullish',
    descHe:'גוף קטן בחלק העליון עם צל תחתי ארוך — לפחות פי שניים מגוף הנר. מופיע לאחר מגמת ירידה. הצל הארוך מראה שמוכרים ניסו לדחוף מחיר מטה אך קונים החזירו אותו לאזור הפתיחה.',
    tipHe:'המתן לאישור — נר שורי ביום המחרת מחזק את האות.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={12} bt={14} bb={28} bw={88} bull={true}/></svg>,
  },
  {
    id:'inverted-hammer', nameHe:'פטיש הפוך', nameEn:'Inverted Hammer', type:'bullish',
    descHe:'גוף קטן בחלק התחתון עם צל עליון ארוך. מופיע לאחר מגמת ירידה. הצל העליון מראה שקונים ניסו לדחוף מחיר מעלה — ניסיון שמהווה אות חיובי גם אם לא הצליח לחלוטין.',
    tipHe:'דורש אישור — נר שורי עם פתיחה מעל גוף הפטיש ההפוך.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={12} bt={68} bb={82} bw={86} bull={true}/></svg>,
  },
  {
    id:'bullish-engulfing', nameHe:'בליעה שורית', nameEn:'Bullish Engulfing', type:'bullish',
    descHe:'נר דובי קטן ואחריו נר שורי גדול שבולע אותו לחלוטין — פותח מתחת ל-close הדובי וסוגר מעל ה-open שלו. שינוי שליטה דרמטי מהמוכרים לקונים.',
    tipHe:'ככל שהנר השורי גדול יותר ביחס לדובי, כך האות חזק יותר.',
    svg:<svg viewBox="0 0 72 100" width="72" height="100"><SvgCandle cx={18} tw={28} bt={35} bb={65} bw={72} bull={false}/><SvgCandle cx={54} tw={14} bt={18} bb={82} bw={86} bull={true}/></svg>,
  },
  {
    id:'piercing-line', nameHe:'קו חודר', nameEn:'Piercing Line', type:'bullish',
    descHe:'הנר הראשון דובי גדול. הנר השני פותח מתחת לשפל הדובי וסוגר מעל אמצע גוף הדובי. הקונים "חדרו" פנימה והחזיקו מעמד — אות היפוך שורי.',
    tipHe:'ככל שהנר השורי חודר עמוק יותר לגוף הדובי, האות חזק יותר.',
    svg:<svg viewBox="0 0 72 100" width="72" height="100"><SvgCandle cx={18} tw={14} bt={20} bb={80} bw={84} bull={false}/><SvgCandle cx={54} tw={35} bt={38} bb={85} bw={88} bull={true}/></svg>,
  },
  {
    id:'bullish-harami', nameHe:'הריון שורי', nameEn:'Bullish Harami', type:'bullish',
    descHe:'נר דובי גדול ואחריו נר שורי קטן שגופו נמצא לחלוטין בתוך גוף הנר הדובי. מצביע על אובדן מומנטום ירידה ואפשרות להיפוך. הנר הקטן "נולד בתוך" הגדול.',
    tipHe:'אות מתון — עדיף להמתין לנר אישור נוסף לפני כניסה.',
    svg:<svg viewBox="0 0 72 100" width="72" height="100"><SvgCandle cx={18} tw={14} bt={18} bb={82} bw={86} bull={false}/><SvgCandle cx={54} tw={40} bt={42} bb={58} bw={60} bull={true}/></svg>,
  },
  {
    id:'three-inside-up', nameHe:'שלושה פנימה מעלה', nameEn:'Three Inside Up', type:'bullish',
    descHe:'הריון שורי + נר שורי שלישי שסוגר מעל הנר הראשון הגדול. הנר השלישי "מאשר" את ההיפוך. דפוס אמין יותר מהריון שורי לבד.',
    tipHe:'שלושת הנרות יחד נותנים אישור — המתן לסגירה מלאה של הנר השלישי.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={14} bt={18} bb={82} bw={86} bull={false}/><SvgCandle cx={55} tw={40} bt={42} bb={58} bw={60} bull={true}/><SvgCandle cx={92} tw={14} bt={16} bb={40} bw={42} bull={true}/></svg>,
  },
  {
    id:'morning-star', nameHe:'כוכב בוקר', nameEn:'Morning Star', type:'bullish',
    descHe:'(1) נר דובי גדול, (2) נר קטן/כוכב שנפתח בפער מטה — מצביע על חוסר החלטיות, (3) נר שורי גדול שסוגר עמוק בתוך הנר הראשון. מהאמינים בקבוצתו.',
    tipHe:'ככל שהנר השלישי גדול ועמוק יותר בנר הראשון, האות חזק יותר.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={16} bt={20} bb={72} bw={76} bull={false}/><SvgCandle cx={55} tw={74} bt={76} bb={84} bw={87} bull={false} clr={NEU}/><SvgCandle cx={92} tw={25} bt={28} bb={70} bw={74} bull={true}/></svg>,
  },
  {
    id:'morning-doji-star', nameHe:'כוכב בוקר דוג\'י', nameEn:'Morning Doji Star', type:'bullish',
    descHe:'כמו כוכב הבוקר, אך הנר האמצעי הוא דוג\'י מדויק (פתיחה = סגירה). הדוג\'י מחזק את חוסר ההחלטיות ומגדיל את עוצמת האות לעומת כוכב בוקר רגיל.',
    tipHe:'חזק יותר מ"כוכב בוקר" — הדוג\'י מבטא ספק מוחלט לפני ההיפוך.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={16} bt={20} bb={72} bw={76} bull={false}/><SvgDoji cx={55} tw={74} my={80} bw={86} clr={NEU}/><SvgCandle cx={92} tw={25} bt={28} bb={70} bw={74} bull={true}/></svg>,
  },
  {
    id:'three-white-soldiers', nameHe:'שלושה חיילים לבנים', nameEn:'Three White Soldiers', type:'bullish',
    descHe:'שלושה נרות שוריים גדולים ברצף, כל אחד פותח בתוך גוף קודמו וסוגר גבוה יותר. מבטא מומנטום שורי חזק ומתמשך. מהאותות החזקים לתחילת מגמת עלייה.',
    tipHe:'הנרות צריכים להיות גדולים ממשיים — גופים רחבים עם מעט צלים.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={62} bt={64} bb={82} bw={85} bull={true}/><SvgCandle cx={55} tw={42} bt={44} bb={66} bw={69} bull={true}/><SvgCandle cx={92} tw={18} bt={20} bb={46} bw={49} bull={true}/></svg>,
  },
  {
    id:'belt-hold-bull', nameHe:'אחיזת חגורה שורית', nameEn:'Belt Hold Bullish', type:'bullish',
    descHe:'נר שורי שפותח בשפל היום (כמעט ללא צל תחתי) וסוגר קרוב לשיא. מאותת על שליטה שורית חזקה מרגע הפתיחה — הקונים השתלטו מיד ולא נתנו למוכרים כל הזדמנות.',
    tipHe:'ככל שהגוף ארוך יותר וצל תחתי קטן יותר, כך האות חזק יותר.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={12} bt={12} bb={82} bw={84} bull={true}/></svg>,
  },
  {
    id:'abandoned-baby-bull', nameHe:'תינוק נטוש שורי', nameEn:'Abandoned Baby Bullish', type:'bullish',
    descHe:'דובי גדול → דוג\'י שמופיע עם פער מטה (ה"תינוק הנטוש") → שורי גדול עם פער מעלה. שני הפערים בולטים. מהאותות הנדירים והחזקים ביותר להיפוך שורי.',
    tipHe:'הנדירות הופכת אותו לאות מהימן מאוד — שני הפערים חיוניים.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={14} bt={18} bb={65} bw={68} bull={false}/><SvgDoji cx={55} tw={72} my={78} bw={84} clr={NEU}/><SvgCandle cx={92} tw={25} bt={28} bb={62} bw={65} bull={true}/></svg>,
  },
  {
    id:'rising-three-methods', nameHe:'שלוש שיטות עולות', nameEn:'Rising Three Methods', type:'bullish',
    descHe:'נר שורי גדול, לאחריו שלושה נרות קטנים דוביים שנשארים בתוך טווח הנר הגדול (הפסקה בתנועה), ולבסוף נר שורי גדול שסוגר מעל כולם. דפוס המשך (Continuation) שורי.',
    tipHe:'אות המשך — לא היפוך. בשימוש נכון אחרי שיא יחסי תוך מגמת עלייה.',
    svg:<svg viewBox="0 0 145 100" width="145" height="100"><SvgCandle cx={15} tw={14} bt={15} bb={68} bw={70} bull={true}/><SvgCandle cx={45} tw={25} bt={27} bb={42} bw={44} bull={false}/><SvgCandle cx={70} tw={30} bt={32} bb={48} bw={50} bull={false}/><SvgCandle cx={95} tw={34} bt={36} bb={52} bw={54} bull={false}/><SvgCandle cx={128} tw={12} bt={14} bb={65} bw={67} bull={true}/></svg>,
  },
  {
    id:'dragonfly-doji', nameHe:'דוג\'י שפירית', nameEn:'Dragonfly Doji', type:'bullish',
    descHe:'גוף כמעט ללא קיום בחלק העליון עם צל תחתי ארוך מאוד. הקונים החזירו את המחיר לאזור הפתיחה אחרי ירידה חדה. מופיע לרוב בתחתיות שוק.',
    tipHe:'אות שורי חזק — ככל שהצל התחתי ארוך יותר, כך האות משמעותי יותר.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgDoji cx={20} tw={10} my={12} bw={88} clr={UP}/></svg>,
  },
  {
    id:'tweezer-bottom', nameHe:'מלקחיים תחתוניים', nameEn:'Tweezer Bottom', type:'bullish',
    descHe:'שני נרות עם שפל (low) זהה בדיוק. הנר הראשון דובי, השני שורי. שניהם "נגעו" באותה רמת תמיכה ולא הצליחו לפרוץ אותה — מאשר את חוזק הרמה.',
    tipHe:'השפל הזהה הוא רמת תמיכה ויזואלית מיידית — נפוץ בסיום מגמות ירידה.',
    svg:<svg viewBox="0 0 72 100" width="72" height="100"><SvgCandle cx={18} tw={25} bt={28} bb={70} bw={88} bull={false}/><SvgCandle cx={54} tw={42} bt={45} bb={70} bw={88} bull={true}/></svg>,
  },

  // ─────────────────────────────────────────────────────── BEARISH ──────────
  {
    id:'shooting-star', nameHe:'כוכב ירי', nameEn:'Shooting Star', type:'bearish',
    descHe:'גוף קטן בחלק התחתון עם צל עליון ארוך — פי שניים לפחות מגוף הנר. מופיע לאחר מגמת עלייה. הקונים דחפו מחיר לגבהים אך המוכרים השתלטו וסגרו קרוב לפתיחה.',
    tipHe:'חפש נר דובי מאשר ביום שאחריו — סגירה מתחת לגוף כוכב הירי.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={12} bt={68} bb={82} bw={86} bull={false}/></svg>,
  },
  {
    id:'hanging-man', nameHe:'האיש התלוי', nameEn:'Hanging Man', type:'bearish',
    descHe:'זהה בצורתו לפטיש אך מופיע לאחר מגמת עלייה. הצל הארוך מגלה שמוכרים ניסו לדחוף מחיר מטה — גם אם הקונים החזירו אותו, מדובר באות אזהרה.',
    tipHe:'מאשר אם נר הבא נסגר מתחת לגוף האיש התלוי.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={12} bt={14} bb={28} bw={88} bull={false}/></svg>,
  },
  {
    id:'bearish-engulfing', nameHe:'בליעה דובית', nameEn:'Bearish Engulfing', type:'bearish',
    descHe:'נר שורי קטן ואחריו נר דובי גדול שבולע אותו לחלוטין. מאותת על שינוי שליטה מקונים למוכרים. מופיע לרוב בפסגות שוק — מהאותות הדוביים הנפוצים והאמינים.',
    tipHe:'אות חזק לצאת מלונג ולשקול שורט.',
    svg:<svg viewBox="0 0 72 100" width="72" height="100"><SvgCandle cx={18} tw={28} bt={35} bb={65} bw={72} bull={true}/><SvgCandle cx={54} tw={14} bt={18} bb={82} bw={86} bull={false}/></svg>,
  },
  {
    id:'dark-cloud-cover', nameHe:'כיסוי ענן כהה', nameEn:'Dark Cloud Cover', type:'bearish',
    descHe:'הנר הראשון שורי גדול. הנר השני פותח מעל שיא הנר הראשון אך סוגר מתחת לאמצע גוף השורי. "ענן כהה" מכסה את השמש.',
    tipHe:'ככל שהנר הדובי חודר עמוק יותר לגוף השורי, האות חזק יותר.',
    svg:<svg viewBox="0 0 72 100" width="72" height="100"><SvgCandle cx={18} tw={16} bt={20} bb={80} bw={84} bull={true}/><SvgCandle cx={54} tw={10} bt={12} bb={57} bw={61} bull={false}/></svg>,
  },
  {
    id:'bearish-harami', nameHe:'הריון דובי', nameEn:'Bearish Harami', type:'bearish',
    descHe:'נר שורי גדול ואחריו נר דובי קטן שגופו בתוך גוף השורי. מצביע על אובדן מומנטום עלייה — הקונים לא מסוגלים להמשיך לדחוף מחירים גבוה יותר.',
    tipHe:'אות מתון — עדיף לחפש אישור נוסף. הריון דובי + דוג\'י = אות חזק יותר.',
    svg:<svg viewBox="0 0 72 100" width="72" height="100"><SvgCandle cx={18} tw={14} bt={18} bb={82} bw={86} bull={true}/><SvgCandle cx={54} tw={40} bt={42} bb={58} bw={60} bull={false}/></svg>,
  },
  {
    id:'three-inside-down', nameHe:'שלושה פנימה מטה', nameEn:'Three Inside Down', type:'bearish',
    descHe:'הריון דובי + נר דובי שלישי שסוגר מתחת לנר הראשון הגדול. הנר השלישי מאשר את ההיפוך. אמין יותר מהריון דובי לבד.',
    tipHe:'שלושת הנרות יחד — הנר השלישי הוא האישור הנדרש לפני כניסה לשורט.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={14} bt={18} bb={82} bw={86} bull={true}/><SvgCandle cx={55} tw={40} bt={42} bb={58} bw={60} bull={false}/><SvgCandle cx={92} tw={56} bt={58} bb={85} bw={87} bull={false}/></svg>,
  },
  {
    id:'evening-star', nameHe:'כוכב ערב', nameEn:'Evening Star', type:'bearish',
    descHe:'(1) נר שורי גדול, (2) נר קטן/כוכב עם פער למעלה, (3) נר דובי גדול שסוגר עמוק בתוך הנר הראשון. האנלוג הדובי לכוכב הבוקר.',
    tipHe:'ככל שהנר השלישי גדול ועמוק יותר בנר הראשון, כך האות חזק יותר.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={25} bt={28} bb={80} bw={84} bull={true}/><SvgCandle cx={55} tw={13} bt={15} bb={23} bw={26} bull={true} clr={NEU}/><SvgCandle cx={92} tw={18} bt={22} bb={74} bw={78} bull={false}/></svg>,
  },
  {
    id:'evening-doji-star', nameHe:'כוכב ערב דוג\'י', nameEn:'Evening Doji Star', type:'bearish',
    descHe:'כמו כוכב הערב, אך הנר האמצעי הוא דוג\'י מדויק. הדוג\'י מחזק את חוסר ההחלטיות ומגדיל את עוצמת האות לעומת כוכב ערב רגיל.',
    tipHe:'חזק יותר מ"כוכב ערב" — הדוג\'י מבטא ספק מוחלט לפני הנפילה.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={25} bt={28} bb={80} bw={84} bull={true}/><SvgDoji cx={55} tw={12} my={14} bw={20} clr={NEU}/><SvgCandle cx={92} tw={18} bt={22} bb={74} bw={78} bull={false}/></svg>,
  },
  {
    id:'three-black-crows', nameHe:'שלושה עורבים שחורים', nameEn:'Three Black Crows', type:'bearish',
    descHe:'שלושה נרות דוביים גדולים ברצף, כל אחד פותח בתוך גוף קודמו וסוגר נמוך יותר. מבטא מומנטום דובי חזק — אחד האותות החזקים לתחילת מגמת ירידה.',
    tipHe:'הנרות צריכים להיות גדולים ואמיתיים — לא גופים קטנים עם צלים ארוכים.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={14} bt={16} bb={35} bw={38} bull={false}/><SvgCandle cx={55} tw={33} bt={35} bb={57} bw={61} bull={false}/><SvgCandle cx={92} tw={55} bt={57} bb={80} bw={84} bull={false}/></svg>,
  },
  {
    id:'belt-hold-bear', nameHe:'אחיזת חגורה דובית', nameEn:'Belt Hold Bearish', type:'bearish',
    descHe:'נר דובי שפותח בשיא היום (כמעט ללא צל עליון) וסוגר קרוב לשפל. מאותת על שליטה דובית חזקה מרגע הפתיחה — המוכרים השתלטו מיד ולא נתנו לקונים הזדמנות.',
    tipHe:'ככל שהגוף ארוך יותר וצל עליון קטן יותר, כך האות חזק יותר.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={12} bt={14} bb={88} bw={90} bull={false}/></svg>,
  },
  {
    id:'abandoned-baby-bear', nameHe:'תינוק נטוש דובי', nameEn:'Abandoned Baby Bearish', type:'bearish',
    descHe:'שורי גדול → דוג\'י עם פער מעלה (ה"תינוק") → דובי גדול עם פער מטה. שני הפערים ממסגרים את הדוג\'י לבד. מהאותות הנדירים והחזקים ביותר להיפוך דובי.',
    tipHe:'נדיר אך אמין מאוד — שני הפערים (מעלה ומטה) חיוניים לתקפות האות.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={14} bt={16} bb={64} bw={67} bull={true}/><SvgDoji cx={55} tw={10} my={12} bw={18} clr={NEU}/><SvgCandle cx={92} tw={22} bt={24} bb={72} bw={75} bull={false}/></svg>,
  },
  {
    id:'falling-three-methods', nameHe:'שלוש שיטות יורדות', nameEn:'Falling Three Methods', type:'bearish',
    descHe:'נר דובי גדול, לאחריו שלושה נרות שוריים קטנים בתוך טווחו (הפסקה), ולבסוף נר דובי גדול שסוגר מתחת לכולם. דפוס המשך (Continuation) דובי.',
    tipHe:'אות המשך — לא היפוך. מאשר את כוח מגמת הירידה.',
    svg:<svg viewBox="0 0 145 100" width="145" height="100"><SvgCandle cx={15} tw={14} bt={15} bb={68} bw={70} bull={false}/><SvgCandle cx={45} tw={45} bt={47} bb={60} bw={62} bull={true}/><SvgCandle cx={70} tw={40} bt={42} bb={56} bw={58} bull={true}/><SvgCandle cx={95} tw={36} bt={38} bb={52} bw={54} bull={true}/><SvgCandle cx={128} tw={12} bt={14} bb={68} bw={70} bull={false}/></svg>,
  },
  {
    id:'upside-gap-two-crows', nameHe:'פער מעלה שני עורבים', nameEn:'Upside Gap Two Crows', type:'bearish',
    descHe:'נר שורי גדול, לאחריו נר דובי קטן עם פער מעלה, ואז נר דובי גדול יותר שבולע את הקטן ופותח בגבהים. שלושת הנרות יחד יוצרים אות דובי משמעותי.',
    tipHe:'שני העורבים שמגיעים אחרי פריצה מעידים על חולשה מסתתרת.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgCandle cx={18} tw={16} bt={18} bb={75} bw={78} bull={true}/><SvgCandle cx={55} tw={10} bt={12} bb={28} bw={31} bull={false}/><SvgCandle cx={92} tw={10} bt={12} bb={45} bw={48} bull={false}/></svg>,
  },
  {
    id:'gravestone-doji', nameHe:'דוג\'י מצבה', nameEn:'Gravestone Doji', type:'bearish',
    descHe:'גוף כמעט ללא קיום בחלק התחתון עם צל עליון ארוך מאוד. הקונים דחפו לגבהים אך המוכרים החזירו לנקודת הפתיחה. אות דובי משמעותי, נפוץ בפסגות שוק.',
    tipHe:'אות דובי חזק — "מצבה" כי היא מסמלת סיום המגמה השורית.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgDoji cx={20} tw={10} my={88} bw={90} clr={DOWN}/></svg>,
  },
  {
    id:'tweezer-top', nameHe:'מלקחיים עליוניים', nameEn:'Tweezer Top', type:'bearish',
    descHe:'שני נרות עם שיא (high) זהה בדיוק. הנר הראשון שורי, השני דובי. שניהם "נגעו" באותה רמת התנגדות ולא הצליחו לפרוץ — מאשר את חוזק הרמה.',
    tipHe:'השיא הזהה הוא רמת התנגדות ויזואלית מיידית — נפוץ בסיום מגמות עלייה.',
    svg:<svg viewBox="0 0 72 100" width="72" height="100"><SvgCandle cx={18} tw={12} bt={14} bb={70} bw={74} bull={true}/><SvgCandle cx={54} tw={12} bt={14} bb={55} bw={58} bull={false}/></svg>,
  },
  {
    id:'marubozu-bear', nameHe:'מארובוזו דובי', nameEn:'Bearish Marubozu', type:'bearish',
    descHe:'נר אדום ענק ללא צלים. פתיחה = שיא היום, סגירה = שפל היום. שליטה דובית מוחלטת לאורך כל המסחר — הקונים כמעט ולא קיבלו שליטה.',
    tipHe:'אות דובי חזק מאוד — ייצוג של שליטה חד-צדדית נדיר.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={10} bt={10} bb={90} bw={90} bull={false}/></svg>,
  },

  // ─────────────────────────────────────────────────────── NEUTRAL ──────────
  {
    id:'doji', nameHe:'דוג\'י', nameEn:'Doji', type:'neutral',
    descHe:'פתיחה וסגירה זהות או כמעט זהות — הגוף כמעט נעדר. חוסר החלטיות מוחלט: כוחות הקנייה והמכירה מאוזנים לחלוטין. לאחר מגמה ממושכת — אות אפשרי להיפוך.',
    tipHe:'תמיד חפש אישור נוסף — לבד אינו מספיק לקבלת החלטת מסחר.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgDoji cx={20} tw={10} my={50} bw={90} clr={NEU}/></svg>,
  },
  {
    id:'spinning-top', nameHe:'ספינינג טופ', nameEn:'Spinning Top', type:'neutral',
    descHe:'גוף קטן במרכז הנר עם צלים ארוכים בשני הצדדים. גם קונים וגם מוכרים ניסו לשלוט אך אף לא הצליח. לרוב מציין הפסקה או מיצוי בתנועה הנוכחית.',
    tipHe:'המתן לנר הבא — הגוף הקטן מצביע על איזון זמני.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={10} bt={40} bb={60} bw={90} neutral={true}/></svg>,
  },
  {
    id:'marubozu-bull', nameHe:'מארובוזו שורי', nameEn:'Bullish Marubozu', type:'neutral',
    descHe:'נר ירוק ענק ללא צלים. פתיחה = שפל היום, סגירה = שיא היום. שליטה שורית מוחלטת לאורך כל המסחר. אות מומנטום חזק מאוד לכיוון העלייה.',
    tipHe:'אות שורי חזק — לא בהכרח כניסה, אלא אישור מגמה חזקה.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={10} bt={10} bb={90} bw={90} bull={true}/></svg>,
  },
  {
    id:'long-legged-doji', nameHe:'דוג\'י רגליים ארוכות', nameEn:'Long-Legged Doji', type:'neutral',
    descHe:'דוג\'י עם צלים ארוכים מאוד בשני הצדדים. מצביע על חוסר החלטיות קיצוני — המחיר נע בטווח רחב מאוד אך חזר לנקודת הפתיחה. מאבק עז ללא מנצח ברור.',
    tipHe:'ככל שהצלים ארוכים יותר, כך חוסר ההחלטיות עמוק ומשמעותי יותר.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgDoji cx={20} tw={8} my={50} bw={92} clr={NEU}/></svg>,
  },
  {
    id:'high-wave', nameHe:'גל גבוה', nameEn:'High Wave', type:'neutral',
    descHe:'גוף קטן עם צלים ארוכים במיוחד — בשני הצדדים. דומה לספינינג טופ אך הצלים ארוכים הרבה יותר. מאותת על אי-ודאות עצומה ומאבק חריף בין הכוחות.',
    tipHe:'ערך ניתוחי בהקשר בלבד — חיתוך עם רמות מפתח מגביר משמעות.',
    svg:<svg viewBox="0 0 40 100" width="40" height="100"><SvgCandle cx={20} tw={5} bt={44} bb={56} bw={95} neutral={true}/></svg>,
  },
  {
    id:'tri-star', nameHe:'שלושה כוכבים', nameEn:'Tri-Star', type:'neutral',
    descHe:'שלושה דוג\'יים ברצף. מאוד נדיר. כאשר מופיע בתחתית — אות היפוך שורי חזק. כאשר מופיע בפסגה — אות היפוך דובי חזק. הנדירות מגדילה את האמינות.',
    tipHe:'נדיר מאוד — כאשר מופיע, הוא אחד מאותות ההיפוך האמינים ביותר.',
    svg:<svg viewBox="0 0 110 100" width="110" height="100"><SvgDoji cx={18} tw={22} my={50} bw={78} clr={NEU}/><SvgDoji cx={55} tw={18} my={46} bw={82} clr={NEU}/><SvgDoji cx={92} tw={22} my={50} bw={78} clr={NEU}/></svg>,
  },
]

// ── CHART PATTERNS ────────────────────────────────────────────────────────────
// SVG viewBox="0 0 160 80" — price lines + key levels
const CHART_PATTERNS = [
  {
    id:'cup-handle', nameHe:'קאפ אנד האנדל', nameEn:'Cup and Handle', type:'bullish',
    descHe:'מחיר יוצר עקומת U עמוקה ועגולה (הכוס), חוזר לרמת הפתיחה, ואז יוצר ירידה קטנה (הידית). לאחר הידית מגיע הפריצה מעלה מעל שפת הכוס. מהדפוסים השוריים האמינים ביותר לטווח ארוך.',
    tipHe:'הידית חיונית — היא "טוהר" את המניה ממוכרים חלשים. כניסה בפריצת שפת הכוס.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        {/* Cup U-curve */}
        <path d="M 5,18 Q 10,20 18,30 Q 30,52 45,65 Q 60,73 80,73 Q 100,73 115,65 Q 130,52 140,32 Q 146,22 150,18"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Handle */}
        <polyline points="150,18 153,24 156,28 159,22" fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Rim resistance dashed */}
        <line x1="5" y1="18" x2="162" y2="18" stroke={BLU} strokeWidth={1.2} strokeDasharray="4,3"/>
        {/* Breakout arrow */}
        <polyline points="159,22 162,14 162,6" fill="none" stroke={UP} strokeWidth={2} strokeLinecap="round"/>
        <circle cx="159" cy="22" r="3" fill={UP}/>
        <text x="8" y="15" fontSize="8" fill={BLU} fontFamily="Inter,sans-serif">רמת שפה</text>
        <text x="130" y="10" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">פריצה ↑</text>
      </svg>
    ),
  },
  {
    id:'head-shoulders', nameHe:'כתף ראש כתף', nameEn:'Head & Shoulders', type:'bearish',
    descHe:'שלושה שיאים: השני (הראש) גבוה מהאחרים (הכתפיים). קו הצוואר (neckline) מחבר את שני השפלים שבין הכתפיים לראש. פריצה מתחת לקו הצוואר מהווה אות כניסה לשורט. מהדפוסים האמינים ביותר להיפוך מגמה.',
    tipHe:'כניסה: פריצה של קו הצוואר (neckline) כלפי מטה. מטרה: גובה הראש.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        {/* Price path: left shoulder → head → right shoulder → breakdown */}
        <polyline points="5,52 16,34 28,52 40,62 52,18 64,60 74,52 86,34 98,52 110,60 128,68 148,75"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Neckline dashed */}
        <line x1="5" y1="52" x2="155" y2="52" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        {/* Breakdown arrow */}
        <circle cx="110" cy="60" r="3" fill={DOWN}/>
        <polyline points="128,68 138,72 148,78" fill="none" stroke={DOWN} strokeWidth={2} strokeLinecap="round"/>
        <text x="6" y="49" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">Neckline</text>
        <text x="48" y="14" fontSize="8" fill={NEU} fontFamily="Inter,sans-serif">ראש</text>
        <text x="12" y="31" fontSize="7" fill={NEU} fontFamily="Inter,sans-serif">כתף</text>
        <text x="83" y="31" fontSize="7" fill={NEU} fontFamily="Inter,sans-serif">כתף</text>
      </svg>
    ),
  },
  {
    id:'inv-head-shoulders', nameHe:'כתף ראש כתף הפוך', nameEn:'Inverse H&S', type:'bullish',
    descHe:'כתף ראש כתף הפוך — שלושה שפלים: האמצעי (הראש) נמוך מהאחרים. פריצה מעל קו הצוואר היא אות כניסה לעסקה שורית. מהדפוסים האמינים ביותר להיפוך מגמת ירידה.',
    tipHe:'כניסה: פריצת קו הצוואר כלפי מעלה. מטרה: גובה הראש.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        {/* Price path: inv left shoulder → head → inv right shoulder → breakout */}
        <polyline points="5,28 16,46 28,28 40,18 52,62 64,20 74,28 86,46 98,28 110,20 128,12 148,5"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Neckline dashed */}
        <line x1="5" y1="28" x2="155" y2="28" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        {/* Breakout arrow */}
        <circle cx="110" cy="20" r="3" fill={UP}/>
        <polyline points="128,12 138,8 148,3" fill="none" stroke={UP} strokeWidth={2} strokeLinecap="round"/>
        <text x="6" y="25" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">Neckline</text>
        <text x="48" y="68" fontSize="8" fill={NEU} fontFamily="Inter,sans-serif">ראש</text>
        <text x="130" y="14" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">פריצה ↑</text>
      </svg>
    ),
  },
  {
    id:'double-bottom', nameHe:'תחתית כפולה (W)', nameEn:'Double Bottom', type:'bullish',
    descHe:'שני שפלים באותה רמה (W) עם שיא ביניהם (קו הצוואר). המחיר ניסה לרדת פעמיים, נדחה, ופרץ מעל קו הצוואר. מאותת על רמת תמיכה חזקה שנבדקה פעמיים.',
    tipHe:'כניסה: פריצת קו הצוואר בנפח גבוה. מטרה: גובה W.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <polyline points="5,18 28,68 52,28 76,66 100,20 130,5"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Neckline dashed */}
        <line x1="5" y1="28" x2="155" y2="28" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        <circle cx="100" cy="20" r="3" fill={UP}/>
        <text x="6" y="25" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">Neckline</text>
        <text x="108" y="15" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">פריצה ↑</text>
      </svg>
    ),
  },
  {
    id:'double-top', nameHe:'פסגה כפולה (M)', nameEn:'Double Top', type:'bearish',
    descHe:'שני שיאים באותה רמה (M) עם שפל ביניהם (קו הצוואר). המחיר ניסה לפרוץ פעמיים ונכשל. פריצה מתחת לקו הצוואר מאשרת את ההיפוך הדובי.',
    tipHe:'כניסה: פריצת קו הצוואר כלפי מטה. מטרה: גובה M.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <polyline points="5,62 28,18 52,50 76,20 100,62 130,72"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="5" y1="50" x2="155" y2="50" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        <circle cx="100" cy="62" r="3" fill={DOWN}/>
        <text x="6" y="47" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">Neckline</text>
        <text x="104" y="72" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">פריצה ↓</text>
      </svg>
    ),
  },
  {
    id:'triple-bottom', nameHe:'תחתית משולשת', nameEn:'Triple Bottom', type:'bullish',
    descHe:'שלושה שפלים באותה רמה. בכל פעם שהמחיר ירד לרמה זו — הוא נדחה. שלוש בדיקות ושלוש דחיות מאשרות תמיכה חזקה מאוד. פריצת קו הצוואר חזקה יותר מתחתית כפולה.',
    tipHe:'שלוש בדיקות חזקות יותר משתיים — אמינות גבוהה יותר.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <polyline points="5,18 22,68 38,26 55,66 72,26 88,65 104,22 126,5"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="5" y1="26" x2="155" y2="26" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        <circle cx="104" cy="22" r="3" fill={UP}/>
        <text x="6" y="23" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">Neckline</text>
      </svg>
    ),
  },
  {
    id:'triple-top', nameHe:'פסגה משולשת', nameEn:'Triple Top', type:'bearish',
    descHe:'שלושה שיאים באותה רמה. כל פעם שהמחיר ניסה לפרוץ מעלה — נדחה. שלוש נסיונות כושלים מאשרים התנגדות חזקה מאוד. פריצת קו הצוואר מטה — אות כניסה לשורט.',
    tipHe:'שלוש כשלונות מאשרות התנגדות — אמינות גבוהה יותר מפסגה כפולה.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <polyline points="5,62 22,18 38,54 55,18 72,54 88,18 104,58 126,72"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="5" y1="54" x2="155" y2="54" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        <circle cx="104" cy="58" r="3" fill={DOWN}/>
        <text x="6" y="51" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">Neckline</text>
      </svg>
    ),
  },
  {
    id:'ascending-triangle', nameHe:'משולש עולה', nameEn:'Ascending Triangle', type:'bullish',
    descHe:'שיאים אופקיים (התנגדות שטוחה) ושפלים עולים. הקונים הולכים ומתחזקים ובכל ירידה ה"רצפה" עולה. בסוף הם פורצים את ההתנגדות. דפוס שורי חזק ביחוד עם ספירת גלים.',
    tipHe:'כניסה: פריצת ההתנגדות האופקית בנפח גבוה. מטרה: גובה המשולש.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        {/* Flat resistance */}
        <line x1="5" y1="18" x2="155" y2="18" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        {/* Rising support */}
        <line x1="5" y1="70" x2="130" y2="35" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        {/* Price zigzag */}
        <polyline points="5,68 22,18 40,54 60,18 76,46 96,18 112,38 128,18 140,14 152,8"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="140" cy="14" r="3" fill={UP}/>
        <text x="6" y="15" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">התנגדות</text>
        <text x="6" y="72" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">תמיכה עולה</text>
      </svg>
    ),
  },
  {
    id:'descending-triangle', nameHe:'משולש יורד', nameEn:'Descending Triangle', type:'bearish',
    descHe:'שפלים אופקיים (תמיכה שטוחה) ושיאים יורדים. המוכרים הולכים ומתחזקים ובכל עלייה ה"תקרה" יורדת. בסוף הם פורצים את התמיכה. דפוס דובי חזק.',
    tipHe:'כניסה: פריצת התמיכה האופקית כלפי מטה בנפח. מטרה: גובה המשולש.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        {/* Flat support */}
        <line x1="5" y1="65" x2="155" y2="65" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        {/* Falling resistance */}
        <line x1="5" y1="18" x2="130" y2="50" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        {/* Price zigzag */}
        <polyline points="5,20 22,65 40,28 60,65 76,36 96,65 112,44 128,65 140,68 150,74"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="140" cy="68" r="3" fill={DOWN}/>
        <text x="6" y="63" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">תמיכה</text>
        <text x="6" y="15" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">התנגדות יורדת</text>
      </svg>
    ),
  },
  {
    id:'sym-triangle', nameHe:'משולש סימטרי', nameEn:'Symmetrical Triangle', type:'neutral',
    descHe:'שיאים יורדים + שפלים עולים — שני קווים מתכנסים. המחיר "דחוס" עד לפריצה שיכולה ללכת לכל כיוון. לרוב מהווה דפוס המשך בכיוון המגמה הקודמת.',
    tipHe:'כיוון הפריצה קובע — המתן לנר סגירה ברור מחוץ לגבולות המשולש.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        {/* Upper falling */}
        <line x1="5" y1="15" x2="110" y2="45" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        {/* Lower rising */}
        <line x1="5" y1="68" x2="110" y2="45" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        {/* Price zigzag */}
        <polyline points="5,18 20,65 38,28 56,58 72,35 86,50 96,40 102,46 108,44"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Breakout */}
        <polyline points="108,44 120,34 136,20 150,8" fill="none" stroke={UP} strokeWidth={2} strokeLinecap="round"/>
        <circle cx="110" cy="45" r="3" fill={UP}/>
        <text x="112" y="10" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">פריצה ↑</text>
      </svg>
    ),
  },
  {
    id:'rising-wedge', nameHe:'טריז עולה (דובי)', nameEn:'Rising Wedge', type:'bearish',
    descHe:'שני קווי מגמה עולים ומתכנסים. למרות שהמחיר עולה — הוא מתדחק לקונה פחות מקום. בסוף הוא פורץ מטה. דפוס דובי למרות שנראה כמו עלייה.',
    tipHe:'כניסה לשורט: פריצת הקו התחתון כלפי מטה. מטרה: בסיס הטריז.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="5" y1="55" x2="115" y2="18" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        <line x1="5" y1="68" x2="115" y2="38" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        <polyline points="5,66 20,55 36,60 52,48 68,54 84,43 100,50 110,38 116,42 122,52 132,60 144,70"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="116" cy="42" r="3" fill={DOWN}/>
        <text x="118" y="66" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">פריצה ↓</text>
      </svg>
    ),
  },
  {
    id:'falling-wedge', nameHe:'טריז יורד (שורי)', nameEn:'Falling Wedge', type:'bullish',
    descHe:'שני קווי מגמה יורדים ומתכנסים. למרות שהמחיר יורד — בכל ירידה המוכרים פחות חזקים. בסוף המחיר פורץ מעלה. דפוס שורי למרות שנראה כמו ירידה.',
    tipHe:'כניסה לונג: פריצת הקו העליון כלפי מעלה. מטרה: בסיס הטריז.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="5" y1="18" x2="115" y2="48" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        <line x1="5" y1="35" x2="115" y2="62" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        <polyline points="5,20 20,35 36,25 52,45 68,32 84,52 100,40 110,60 116,52 122,42 132,28 144,14"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="116" cy="52" r="3" fill={UP}/>
        <text x="118" y="14" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">פריצה ↑</text>
      </svg>
    ),
  },
  {
    id:'bull-flag', nameHe:'דגל שורי', nameEn:'Bull Flag', type:'bullish',
    descHe:'עמוד חד מעלה (ה"עמוד") ואחריו תיקון קטן ומסודר במקביל לקווי ערוץ יורד קל (ה"דגל"). פריצת הדגל מעלה היא אות כניסה. מהדפוסים האמינים ביותר להמשך מגמה שורית.',
    tipHe:'הדגל צריך להיות קטן ביחס לעמוד — תיקון לא עמוק מ-50% מהעמוד.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        {/* Pole */}
        <line x1="30" y1="18" x2="30" y2="70" stroke={UP} strokeWidth={3} strokeLinecap="round"/>
        {/* Pole base going up */}
        <polyline points="5,72 30,18" fill="none" stroke={UP} strokeWidth={2.5} strokeLinecap="round"/>
        {/* Flag channel */}
        <line x1="30" y1="18" x2="90" y2="26" stroke={NEU} strokeWidth={1} strokeDasharray="3,3"/>
        <line x1="30" y1="28" x2="90" y2="36" stroke={NEU} strokeWidth={1} strokeDasharray="3,3"/>
        {/* Flag price */}
        <polyline points="30,20 40,26 52,22 64,30 76,24 88,30"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Breakout */}
        <polyline points="88,28 100,18 118,8 138,2" fill="none" stroke={UP} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx="88" cy="28" r="3" fill={UP}/>
        <text x="5" y="78" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">עמוד</text>
        <text x="44" y="42" fontSize="8" fill={NEU} fontFamily="Inter,sans-serif">דגל</text>
        <text x="108" y="10" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">פריצה ↑</text>
      </svg>
    ),
  },
  {
    id:'bear-flag', nameHe:'דגל דובי', nameEn:'Bear Flag', type:'bearish',
    descHe:'עמוד חד מטה ואחריו תיקון קטן ומסודר בערוץ עולה קל. פריצת הדגל מטה היא אות כניסה לשורט. האנלוג הדובי לדגל השורי.',
    tipHe:'הדגל לא צריך לתקן יותר מ-50% מהעמוד — תיקון גדול מדי מבטל את הדפוס.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        {/* Pole down */}
        <polyline points="5,8 30,62" fill="none" stroke={DOWN} strokeWidth={2.5} strokeLinecap="round"/>
        {/* Flag channel */}
        <line x1="30" y1="62" x2="90" y2="52" stroke={NEU} strokeWidth={1} strokeDasharray="3,3"/>
        <line x1="30" y1="52" x2="90" y2="42" stroke={NEU} strokeWidth={1} strokeDasharray="3,3"/>
        {/* Flag price */}
        <polyline points="30,60 40,54 52,58 64,50 76,54 88,48"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Breakdown */}
        <polyline points="88,50 100,60 118,68 138,76" fill="none" stroke={DOWN} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx="88" cy="50" r="3" fill={DOWN}/>
        <text x="5" y="6" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">עמוד</text>
        <text x="44" y="44" fontSize="8" fill={NEU} fontFamily="Inter,sans-serif">דגל</text>
        <text x="106" y="74" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">פריצה ↓</text>
      </svg>
    ),
  },
  {
    id:'pennant', nameHe:'פנון (Pennant)', nameEn:'Pennant', type:'neutral',
    descHe:'עמוד חד + משולש סימטרי קטן (ה"פנון") + פריצה בכיוון המגמה המקורית. כמו הדגל אך הקונסולידציה היא משולש מתכנס במקום ערוץ. דפוס המשך אמין.',
    tipHe:'הפנון חייב להיות קטן ביחס לעמוד — ככל שקצר יותר זמנית כך אמין יותר.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        {/* Pole */}
        <polyline points="5,72 28,18" fill="none" stroke={UP} strokeWidth={2.5} strokeLinecap="round"/>
        {/* Pennant (converging lines) */}
        <line x1="28" y1="18" x2="82" y2="36" stroke={NEU} strokeWidth={1} strokeDasharray="3,3"/>
        <line x1="28" y1="30" x2="82" y2="36" stroke={NEU} strokeWidth={1} strokeDasharray="3,3"/>
        {/* Pennant price */}
        <polyline points="28,20 38,28 48,22 58,28 66,24 74,28 80,30"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Breakout */}
        <polyline points="80,30 92,22 108,12 126,4" fill="none" stroke={UP} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx="80" cy="30" r="3" fill={UP}/>
        <text x="5" y="78" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">עמוד</text>
        <text x="40" y="42" fontSize="8" fill={NEU} fontFamily="Inter,sans-serif">פנון</text>
      </svg>
    ),
  },
  {
    id:'rounding-bottom', nameHe:'תחתית עגולה (Saucer)', nameEn:'Rounding Bottom', type:'bullish',
    descHe:'ירידה הדרגתית איטית, שטייה בתחתית, ועלייה הדרגתית סימטרית — יוצרים עקומת U חלקה. תהליך שינוי המגמה איטי אך אמין. לרוב מלווה בירידת נפח בשטייה ועלייתו בפריצה.',
    tipHe:'הסבלנות משתלמת — ככל שה"סיר" (Saucer) עמוק ורחב יותר, ההיפוך חזק יותר.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <path d="M 5,18 Q 12,22 20,32 Q 35,52 55,66 Q 80,76 105,66 Q 125,52 140,32 Q 148,22 153,16 Q 156,10 158,5"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx="153" cy="16" r="3" fill={UP}/>
        <text x="6" y="15" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">פריצה ↑</text>
      </svg>
    ),
  },
  {
    id:'channel-up', nameHe:'ערוץ עולה', nameEn:'Ascending Channel', type:'bullish',
    descHe:'המחיר עולה בין שני קווים מקביליים עולים. הרצפה (תמיכה) והתקרה (התנגדות) עולים יחד. קנייה בנגיעה בתמיכה התחתונה. פריצה מתחת לערוץ — אזהרה לשינוי מגמה.',
    tipHe:'קנייה: נגיעה בקו התחתון. יציאה: פריצת הקו התחתון מטה.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="5" y1="65" x2="155" y2="18" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        <line x1="5" y1="80" x2="155" y2="35" stroke={UP} strokeWidth={1.2} strokeDasharray="4,3"/>
        <polyline points="5,78 25,60 40,68 60,50 75,58 95,40 110,48 130,30 145,20 155,16"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <text x="6" y="62" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">תמיכה עולה</text>
        <text x="105" y="18" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">↑</text>
      </svg>
    ),
  },
  {
    id:'channel-down', nameHe:'ערוץ יורד', nameEn:'Descending Channel', type:'bearish',
    descHe:'המחיר יורד בין שני קווים מקביליים יורדים. שורט בנגיעה בהתנגדות העליונה. פריצה מעל לערוץ — אזהרה לשינוי מגמה. ניתן לקנות "ריבאונד" ולמכור בהתנגדות.',
    tipHe:'שורט: נגיעה בקו העליון. יציאה: פריצת הקו העליון מעלה.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="5" y1="15" x2="155" y2="62" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        <line x1="5" y1="2"  x2="155" y2="48" stroke={DOWN} strokeWidth={1.2} strokeDasharray="4,3"/>
        <polyline points="5,4 25,22 40,14 60,32 75,22 95,40 110,30 130,48 145,58 155,64"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <text x="6" y="12" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">התנגדות יורדת</text>
        <text x="105" y="72" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">↓</text>
      </svg>
    ),
  },
]

// ── TECHNICAL INDICATORS ──────────────────────────────────────────────────────
const INDICATORS = [
  {
    id:'rsi', nameHe:'RSI — מדד חוזק יחסי', nameEn:'RSI — Relative Strength Index', type:'momentum',
    descHe:'RSI מודד את מהירות ועוצמת תנועות המחיר בסקאלה 0–100. מעל 70 = קנייה-יתר (overbought) — סיכון להיפוך דובי. מתחת ל-30 = מכירה-יתר (oversold) — הזדמנות שורית. ברירת מחדל: 14 תקופות. אחד הכלים הנפוצים ביותר.',
    tipHe:'דיברגנס: מחיר עולה אך RSI יורד = אזהרה חזקה. מחיר יורד אך RSI עולה = אות שורי מוקדם. שלב עם תמיכה/התנגדות לאישור.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <rect x="0" y="2" width="160" height="16" fill="#e5393514"/>
        <rect x="0" y="62" width="160" height="16" fill="#26a65b14"/>
        <line x1="0" y1="18" x2="160" y2="18" stroke={DOWN} strokeWidth={1} strokeDasharray="4,3"/>
        <line x1="0" y1="62" x2="160" y2="62" stroke={UP} strokeWidth={1} strokeDasharray="4,3"/>
        <polyline points="0,45 15,38 28,12 42,8 55,22 68,40 80,55 92,65 105,68 118,52 132,35 145,28 160,32"
          fill="none" stroke={BLU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <text x="4" y="16" fontSize="8" fill={DOWN} fontFamily="Inter,sans-serif">70 — Overbought</text>
        <text x="4" y="77" fontSize="8" fill={UP} fontFamily="Inter,sans-serif">30 — Oversold</text>
        <circle cx="42" cy="8" r="3" fill={DOWN}/>
        <circle cx="105" cy="68" r="3" fill={UP}/>
      </svg>
    ),
  },
  {
    id:'macd', nameHe:'MACD — קו הבדל ממוצעים', nameEn:'MACD — Moving Average Convergence/Divergence', type:'momentum',
    descHe:'MACD = EMA(12) פחות EMA(26). כאשר קו MACD חוצה את קו האות (Signal = EMA9) מלמטה — אות שורי. מלמעלה — אות דובי. ההיסטוגרמה מציגה את הפרש ביניהם. נפוץ לזיהוי היפוכי מגמה ואישור כיוון.',
    tipHe:'הצלבת MACD מעל קו האות + היסטוגרמה שמתחילה לגדול = אות כניסה שורי חזק. MACD מאט לפני מחיר.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="0" y1="44" x2="160" y2="44" stroke={NEU} strokeWidth={1} strokeDasharray="3,3"/>
        <rect x="5"   y="34" width="8" height="10" fill={UP}   rx="1" opacity="0.8"/>
        <rect x="18"  y="28" width="8" height="16" fill={UP}   rx="1" opacity="0.8"/>
        <rect x="31"  y="33" width="8" height="11" fill={UP}   rx="1" opacity="0.8"/>
        <rect x="44"  y="43" width="8" height="1"  fill={UP}   rx="1" opacity="0.8"/>
        <rect x="57"  y="44" width="8" height="8"  fill={DOWN} rx="1" opacity="0.8"/>
        <rect x="70"  y="44" width="8" height="14" fill={DOWN} rx="1" opacity="0.8"/>
        <rect x="83"  y="44" width="8" height="10" fill={DOWN} rx="1" opacity="0.8"/>
        <rect x="96"  y="44" width="8" height="4"  fill={DOWN} rx="1" opacity="0.8"/>
        <rect x="109" y="38" width="8" height="6"  fill={UP}   rx="1" opacity="0.8"/>
        <rect x="122" y="32" width="8" height="12" fill={UP}   rx="1" opacity="0.8"/>
        <rect x="135" y="26" width="8" height="18" fill={UP}   rx="1" opacity="0.8"/>
        <rect x="148" y="22" width="8" height="22" fill={UP}   rx="1" opacity="0.8"/>
        <polyline points="9,32 22,26 35,30 48,44 61,54 74,60 87,56 100,48 113,40 126,32 139,26 152,22"
          fill="none" stroke={BLU} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="9,36 22,32 35,34 48,44 61,55 74,60 87,56 100,49 113,42 126,35 139,29 152,25"
          fill="none" stroke={ORAN} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,2"/>
        <text x="4" y="10" fontSize="7" fill={BLU}  fontFamily="Inter,sans-serif">— MACD</text>
        <text x="4" y="20" fontSize="7" fill={ORAN} fontFamily="Inter,sans-serif">-- Signal</text>
      </svg>
    ),
  },
  {
    id:'bollinger', nameHe:'רצועות בולינגר', nameEn:'Bollinger Bands', type:'volatility',
    descHe:'שלושה קווים: ממוצע נע (MA20) במרכז + רצועה עליונה ותחתונה ב-2 סטיות תקן. כאשר הרצועות מתכווצות (Squeeze) — פריצה חדה עומדת להגיע. מגע ברצועה העליונה = קנייה-יתר. מגע בתחתונה = מכירה-יתר.',
    tipHe:'Bollinger Squeeze: כאשר הרצועות צרות מאוד — התפוצצות קרובה! כיוון הפריצה לא ידוע — המתן לנר אישור ברור.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <path d="M 5,35 Q 30,32 55,24 Q 80,18 105,16 Q 130,20 155,32"
          fill="none" stroke={DOWN} strokeWidth={1.5} strokeDasharray="4,3" strokeLinecap="round"/>
        <path d="M 5,55 Q 30,58 55,65 Q 80,70 105,72 Q 130,68 155,56"
          fill="none" stroke={UP} strokeWidth={1.5} strokeDasharray="4,3" strokeLinecap="round"/>
        <path d="M 5,45 Q 80,44 155,44"
          fill="none" stroke={NEU} strokeWidth={1} strokeDasharray="2,2" strokeLinecap="round"/>
        <polyline points="5,44 18,50 30,38 42,55 54,28 66,20 78,28 90,70 102,73 114,64 126,50 138,38 150,34"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <text x="108" y="12" fontSize="7" fill={DOWN} fontFamily="Inter,sans-serif">Upper Band</text>
        <text x="108" y="78" fontSize="7" fill={UP}   fontFamily="Inter,sans-serif">Lower Band</text>
        <text x="2"   y="43" fontSize="7" fill={NEU}  fontFamily="Inter,sans-serif">MA20</text>
      </svg>
    ),
  },
  {
    id:'ma', nameHe:'ממוצע נע — SMA / EMA', nameEn:'Moving Average — SMA / EMA', type:'trend',
    descHe:'SMA מחשב ממוצע פשוט של N מחירים אחרונים. EMA נותן משקל גדול לנרות האחרונים ומגיב מהר יותר. MA50 ו-MA200 הם הקווים הנצפים ביותר. מחיר מעל MA200 = מגמה שורית ארוכת טווח. MA50 מעל MA200 = Golden Cross.',
    tipHe:'Golden Cross (MA50 מעל MA200) = אות שורי חזק. Death Cross (MA50 מתחת ל-MA200) = אות דובי. שלב עם נפח לאישור.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <polyline points="5,62 14,56 22,62 30,50 38,58 46,44 54,40 62,36 70,42 78,30 86,26 94,32 102,24 110,18 118,24 126,16 134,12 142,18 150,14 158,10"
          fill="none" stroke={NEU} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
        <polyline points="5,60 20,56 38,52 55,46 72,40 89,35 106,29 122,22 140,16 158,12"
          fill="none" stroke={BLU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="5,66 30,62 60,58 90,53 120,48 158,44"
          fill="none" stroke={ORAN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,3"/>
        <text x="4"  y="10" fontSize="7" fill={BLU}  fontFamily="Inter,sans-serif">— EMA50</text>
        <text x="4"  y="20" fontSize="7" fill={ORAN} fontFamily="Inter,sans-serif">-- SMA200</text>
        <circle cx="72" cy="40" r="3" fill={BLU}/>
        <text x="75" y="38" fontSize="7" fill={BLU} fontFamily="Inter,sans-serif">Cross ↑</text>
      </svg>
    ),
  },
  {
    id:'volume', nameHe:'נפח מסחר (Volume)', nameEn:'Volume — Trade Confirmation', type:'volume',
    descHe:'נפח = כמות המניות שנסחרו. נפח גבוה + עלייה = קנייה מוסדית "אמיתית". נפח נמוך + עלייה = חולשה נסתרת. פריצת דפוס בנפח גבוה = אות חזק. פריצה בנפח נמוך = "פריצה מזויפת" שכיחה. תמיד בדוק נפח לפני כניסה.',
    tipHe:'נפח פריצה צריך להיות לפחות 150% מהממוצע כדי להיחשב אמין. נפח יורד במגמת עלייה = אזהרה לשינוי.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="0" y1="48" x2="160" y2="48" stroke={NEU} strokeWidth={1} strokeDasharray="3,3"/>
        <rect x="4"   y="58" width="9" height="17" fill={UP}   rx="1" opacity="0.75"/>
        <rect x="18"  y="52" width="9" height="23" fill={UP}   rx="1" opacity="0.75"/>
        <rect x="32"  y="55" width="9" height="20" fill={DOWN} rx="1" opacity="0.75"/>
        <rect x="46"  y="58" width="9" height="17" fill={UP}   rx="1" opacity="0.75"/>
        <rect x="60"  y="56" width="9" height="19" fill={DOWN} rx="1" opacity="0.75"/>
        <rect x="74"  y="8"  width="9" height="67" fill={UP}   rx="1" opacity="0.95"/>
        <rect x="88"  y="46" width="9" height="29" fill={UP}   rx="1" opacity="0.75"/>
        <rect x="102" y="54" width="9" height="21" fill={DOWN} rx="1" opacity="0.75"/>
        <rect x="116" y="60" width="9" height="15" fill={UP}   rx="1" opacity="0.75"/>
        <rect x="130" y="56" width="9" height="19" fill={UP}   rx="1" opacity="0.75"/>
        <rect x="144" y="62" width="9" height="13" fill={DOWN} rx="1" opacity="0.75"/>
        <text x="77" y="6"  fontSize="7" fill={UP}  fontFamily="Inter,sans-serif">פריצה!</text>
        <text x="2"  y="46" fontSize="7" fill={NEU} fontFamily="Inter,sans-serif">Avg</text>
      </svg>
    ),
  },
  {
    id:'atr', nameHe:'ATR — טווח אמיתי ממוצע', nameEn:'ATR — Average True Range', type:'volatility',
    descHe:'ATR מודד את הטווח הממוצע של תנועת המחיר ב-N תקופות (ברירת מחדל: 14). ATR גבוה = שוק תנודתי — הסטופ צריך להיות רחב יותר. ATR נמוך = שוק שקט — סטופ יכול להיות צר. משמש לקביעת גודל פוזיציה ומרחק הסטופ.',
    tipHe:'כלל אצבע: מקם סטופ לוס ב-1.5 עד 2 כפול ATR מתחת לנקודת הכניסה. כך הסטופ מותאם לתנודתיות האמיתית.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="0" y1="52" x2="160" y2="52" stroke={NEU} strokeWidth={1} strokeDasharray="3,3"/>
        <polyline points="5,68 20,62 35,56 50,50 65,38 80,24 95,16 110,14 125,20 140,32 155,44"
          fill="none" stroke={PURP} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <text x="80" y="12" fontSize="7" fill={PURP} fontFamily="Inter,sans-serif">↑ תנודתיות גבוהה</text>
        <text x="4"  y="78" fontSize="7" fill={PURP} fontFamily="Inter,sans-serif">↓ תנודתיות נמוכה</text>
        <text x="2"  y="50" fontSize="7" fill={NEU}  fontFamily="Inter,sans-serif">ממוצע</text>
        <circle cx="110" cy="14" r="3" fill={PURP}/>
      </svg>
    ),
  },
  {
    id:'stochastic', nameHe:'סטוכסטיק (%K / %D)', nameEn:'Stochastic Oscillator', type:'momentum',
    descHe:'סטוכסטיק מודד היכן המחיר נמצא ביחס לטווח המחיר בתקופה נתונה (ברירת מחדל: 14). %K = קו הסטוכסטיק המהיר. %D = ממוצע נע של %K (האיטי). הצלבת %K מעל %D באזור oversold (מתחת ל-20) = אות שורי חזק.',
    tipHe:'עדיף לחפש הצלבות באזור overbought (מעל 80) ו-oversold (מתחת ל-20) — הצלבות במרכז פחות מהימנות.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <rect x="0" y="2"  width="160" height="14" fill="#e5393514"/>
        <rect x="0" y="64" width="160" height="14" fill="#26a65b14"/>
        <line x1="0" y1="16" x2="160" y2="16" stroke={DOWN} strokeWidth={1} strokeDasharray="4,3"/>
        <line x1="0" y1="64" x2="160" y2="64" stroke={UP}   strokeWidth={1} strokeDasharray="4,3"/>
        <polyline points="0,55 14,44 28,28 42,10 56,8 70,18 84,40 98,60 112,66 126,56 140,38 154,26 160,20"
          fill="none" stroke={BLU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="0,58 14,50 28,35 42,16 56,12 70,22 84,44 98,62 112,67 126,58 140,42 154,30 160,24"
          fill="none" stroke={ORAN} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,2"/>
        <text x="4"  y="12" fontSize="7" fill={DOWN} fontFamily="Inter,sans-serif">80 — Overbought</text>
        <text x="4"  y="77" fontSize="7" fill={UP}   fontFamily="Inter,sans-serif">20 — Oversold</text>
        <text x="114" y="10" fontSize="7" fill={BLU}  fontFamily="Inter,sans-serif">%K</text>
        <text x="130" y="10" fontSize="7" fill={ORAN} fontFamily="Inter,sans-serif">%D</text>
        <circle cx="126" cy="56" r="3" fill={UP}/>
      </svg>
    ),
  },
  {
    id:'pivot', nameHe:'נקודות ציר — Pivot Points', nameEn:'Pivot Points — S/R Levels', type:'trend',
    descHe:'נקודות ציר מחושבות מהגבוה, הנמוך, והסגירה של היום הקודם. PP (נקודה ציר) = (H+L+C)/3. מעל PP — מגמה שורית ביום. מתחת — דובית. R1/R2/R3 = רמות התנגדות. S1/S2/S3 = רמות תמיכה. כלי יומי קלאסי.',
    tipHe:'Pivot Points נפוצים בסחר יומי (day trading). שלב עם RSI וMACD לאישות כניסה ב-S1 או מכירה ב-R1.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="5" y1="10" x2="155" y2="10" stroke={DOWN} strokeWidth={1}   strokeDasharray="3,3"/>
        <line x1="5" y1="24" x2="155" y2="24" stroke={DOWN} strokeWidth={1}   strokeDasharray="3,3"/>
        <line x1="5" y1="40" x2="155" y2="40" stroke={BLU}  strokeWidth={1.5} strokeDasharray="4,2"/>
        <line x1="5" y1="56" x2="155" y2="56" stroke={UP}   strokeWidth={1}   strokeDasharray="3,3"/>
        <line x1="5" y1="70" x2="155" y2="70" stroke={UP}   strokeWidth={1}   strokeDasharray="3,3"/>
        <polyline points="5,62 20,58 35,44 50,36 65,28 80,36 95,44 110,36 125,26 140,16 155,10"
          fill="none" stroke={NEU} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <text x="130" y="8"  fontSize="7" fill={DOWN} fontFamily="Inter,sans-serif">R2</text>
        <text x="130" y="22" fontSize="7" fill={DOWN} fontFamily="Inter,sans-serif">R1</text>
        <text x="130" y="38" fontSize="7" fill={BLU}  fontFamily="Inter,sans-serif">PP</text>
        <text x="130" y="54" fontSize="7" fill={UP}   fontFamily="Inter,sans-serif">S1</text>
        <text x="130" y="68" fontSize="7" fill={UP}   fontFamily="Inter,sans-serif">S2</text>
      </svg>
    ),
  },
]

// ── RISK MANAGEMENT ────────────────────────────────────────────────────────────
const RISK_MGMT = [
  {
    id:'stop-loss', nameHe:'סטופ לוס — הגדרת סיכון', nameEn:'Stop Loss — Define Your Risk', type:'risk',
    descHe:'סטופ לוס קובע מראש את הסכום המקסימלי שאתה מוכן להפסיד בעסקה. ללא סטופ לוס — אתה חשוף להפסדים בלתי מוגבלים. כלל ברזל: לעולם אל תעביר סטופ לוס בכיוון ההפסד ("הנחת הסטופ"). מקם תמיד מתחת לרמת תמיכה ברורה.',
    tipHe:'הנחת הסטופ (moving stop loss lower) היא הרגל ההרסני ביותר. אם הגעת לסטופ — צא. אל תנחש מחדש.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="5" y1="20" x2="152" y2="20" stroke={UP}   strokeWidth={1.5} strokeDasharray="4,3"/>
        <line x1="5" y1="42" x2="152" y2="42" stroke={BLU}  strokeWidth={1.5} strokeDasharray="4,3"/>
        <line x1="5" y1="64" x2="152" y2="64" stroke={DOWN} strokeWidth={1.5} strokeDasharray="4,3"/>
        <rect x="5" y="20" width="140" height="22" fill="#26a65b12" rx="0"/>
        <rect x="5" y="42" width="140" height="22" fill="#e5393512" rx="0"/>
        <text x="118" y="17"  fontSize="7" fill={UP}   fontFamily="Inter,sans-serif">מטרה TP</text>
        <text x="118" y="40"  fontSize="7" fill={BLU}  fontFamily="Inter,sans-serif">כניסה</text>
        <text x="118" y="74"  fontSize="7" fill={DOWN} fontFamily="Inter,sans-serif">סטופ SL</text>
        <polyline points="5,42 30,36 55,28 72,42 72,55 90,42"
          fill="none" stroke={NEU} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="90,40 108,28 128,20 148,16"
          fill="none" stroke={UP} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx="5"  cy="42" r="4" fill={BLU}/>
        <circle cx="148" cy="16" r="3" fill={UP}/>
        <text x="2" y="40" fontSize="7" fill={BLU} fontFamily="Inter,sans-serif">Entry</text>
      </svg>
    ),
  },
  {
    id:'risk-reward', nameHe:'יחס סיכוי-סיכון (R:R)', nameEn:'Risk:Reward Ratio', type:'risk',
    descHe:'R:R = רווח פוטנציאלי חלקי הפסד מוגדר. R:R 1:2 = מוכן להפסיד 100₪ כדי להרוויח 200₪. עם R:R 1:2 ו-40% הצלחה בלבד — אתה עדיין מרוויח לטווח ארוך. רוב מקצוענים דורשים לפחות 1:2 לכל עסקה.',
    tipHe:'לפני כל עסקה: "כמה אני מרוויח אם צודק? כמה אני מפסיד אם טועה?" אם R:R פחות מ-1:2 — דלג על העסקה.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <line x1="0" y1="50" x2="160" y2="50" stroke={BLU} strokeWidth={1.5} strokeDasharray="3,3"/>
        <rect x="5" y="10" width="148" height="40" fill="#26a65b18" rx="4"/>
        <rect x="5" y="50" width="148" height="22" fill="#e5393518" rx="4"/>
        <text x="10" y="34" fontSize="10" fill={UP}   fontFamily="Heebo,sans-serif" fontWeight="700">רווח 2R = +200₪</text>
        <text x="10" y="64" fontSize="10" fill={DOWN} fontFamily="Heebo,sans-serif" fontWeight="700">סיכון 1R = -100₪</text>
        <text x="10" y="47" fontSize="8"  fill={BLU}  fontFamily="Inter,sans-serif">Entry ────────────────</text>
        <line x1="4" y1="10" x2="4" y2="50" stroke={UP}   strokeWidth={3} strokeLinecap="round"/>
        <line x1="4" y1="50" x2="4" y2="72" stroke={DOWN} strokeWidth={3} strokeLinecap="round"/>
        <text x="110" y="78" fontSize="11" fill={BLU} fontFamily="Heebo,sans-serif" fontWeight="800">R:R = 1:2</text>
      </svg>
    ),
  },
  {
    id:'position-sizing', nameHe:'גודל פוזיציה — Position Sizing', nameEn:'Position Sizing Formula', type:'risk',
    descHe:'גודל פוזיציה = (הון × % סיכון) ÷ (מחיר כניסה − מחיר סטופ). דוגמה: הון 100,000₪, מסכן 1%, מחיר כניסה 50₪, סטופ 45₪ = (100,000×0.01)÷5 = 200 מניות. כלל מקצועי: לעולם לא יותר מ-1–2% מהון בעסקה אחת.',
    tipHe:'2% מעל-כולם הוא כלל מקצועי בסיסי. אפילו עם 10 הפסדות ברצף — הון שורד ומאפשר המשך. שמור על העיקרון!',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <rect x="5" y="8"  width="150" height="18" fill="#3b6ff518" rx="4" stroke={BLU}  strokeWidth={1}/>
        <text x="10" y="21" fontSize="9" fill={BLU}  fontFamily="Heebo,sans-serif" fontWeight="700">הון × 1% = 1,000₪</text>
        <text x="68" y="38" fontSize="14" fill={NEU}  fontFamily="Inter,sans-serif">÷</text>
        <rect x="5" y="40" width="150" height="18" fill="#f59e0b18" rx="4" stroke={ORAN} strokeWidth={1}/>
        <text x="10" y="53" fontSize="9" fill={ORAN} fontFamily="Heebo,sans-serif" fontWeight="700">מחיר כניסה − מחיר סטופ = 5₪</text>
        <line x1="5" y1="62" x2="155" y2="62" stroke={NEU} strokeWidth={1.5}/>
        <rect x="5" y="64" width="150" height="14" fill="#26a65b18" rx="4"/>
        <text x="30" y="74" fontSize="10" fill={UP} fontFamily="Heebo,sans-serif" fontWeight="800">= 200 מניות לקנות</text>
      </svg>
    ),
  },
  {
    id:'trailing-stop', nameHe:'סטופ נגרר — Trailing Stop', nameEn:'Trailing Stop Loss', type:'risk',
    descHe:'סטופ נגרר עולה אוטומטית עם המחיר ו"נועל" רווחים. כשמחיר עלה 10% — הסטופ עולה 10%. אם המחיר יירד — הסטופ נשאר במקום ומגן על הרווח הנצבר. מושלם לניהול עסקאות טרנד ארוכות.',
    tipHe:'הפעל סטופ נגרר לאחר שהגעת ל-1R רווח — כך מובטח breakeven לפחות. קבע מרחק לפי ATR.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <polyline points="5,68 22,58 42,44 60,30 80,20 100,12 118,8 136,8 154,8"
          fill="none" stroke={UP} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="5,76 22,67 42,54 60,44 80,36 100,30 118,28 132,34 142,44 154,54"
          fill="none" stroke={DOWN} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,2"/>
        <circle cx="132" cy="34" r="3" fill={DOWN}/>
        <text x="4"   y="66" fontSize="7" fill={UP}   fontFamily="Inter,sans-serif">מחיר</text>
        <text x="4"   y="78" fontSize="7" fill={DOWN} fontFamily="Inter,sans-serif">סטופ נגרר</text>
        <text x="136" y="30" fontSize="7" fill={DOWN} fontFamily="Inter,sans-serif">הפעלה ↓</text>
      </svg>
    ),
  },
  {
    id:'diversification', nameHe:'פיזור סיכונים — Diversification', nameEn:'Portfolio Diversification', type:'risk',
    descHe:'פיזור = אל תשים את כל הביצים בסל אחד. עסקאות עם קורלציה נמוכה מפחיתות סיכון כולל. לא פיזור אמיתי: 5 מניות טכנולוגיה. פיזור אמיתי: סקטורים שונים, מניות שונות, טווחי זמן שונים.',
    tipHe:'אל תחזיק יותר מ-20% מהון בסקטור אחד, ולא יותר מ-5% ממניה בודדת. פיזור = ביטוח בחינם.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <circle cx="52"  cy="44" r="28" fill="#3b6ff520" stroke={BLU}  strokeWidth={1.5}/>
        <circle cx="100" cy="30" r="20" fill="#26a65b20" stroke={UP}   strokeWidth={1.5}/>
        <circle cx="126" cy="56" r="15" fill="#f59e0b20" stroke={ORAN} strokeWidth={1.5}/>
        <circle cx="80"  cy="62" r="10" fill="#8b5cf620" stroke={PURP} strokeWidth={1.5}/>
        <text x="36"  y="46" fontSize="8" fill={BLU}  fontFamily="Heebo,sans-serif" fontWeight="700">מניות</text>
        <text x="88"  y="32" fontSize="7" fill={UP}   fontFamily="Heebo,sans-serif">אג"ח</text>
        <text x="115" y="58" fontSize="7" fill={ORAN} fontFamily="Heebo,sans-serif">סחורות</text>
        <text x="70"  y="64" fontSize="7" fill={PURP} fontFamily="Heebo,sans-serif">נדל"ן</text>
        <text x="2"   y="12" fontSize="9" fill={NEU}  fontFamily="Heebo,sans-serif">פיזור = הפחתת סיכון</text>
      </svg>
    ),
  },
  {
    id:'journal', nameHe:'יומן מסחר — Trading Journal', nameEn:'Trading Journal', type:'risk',
    descHe:'יומן מסחר הוא אחד הכלים החשובים ביותר לשיפור. רשום כל עסקה: סיבת כניסה, יציאה, מה עבד, מה לא. אחרי 50 עסקאות תתחיל לראות דפוסים — אילו הגדרות עובדות לך, מתי אתה טועה, מה פסיכולוגיית ההחלטות שלך.',
    tipHe:'רשום גם עסקאות שלא כנסת אליהן ולמה. לעתים ה"לא" הוא ההחלטה הכי חשובה שלך ביום.',
    svg:(
      <svg viewBox="0 0 160 80" width="160" height="80">
        <rect x="5"  y="5"  width="150" height="70" fill={BLU} fillOpacity="0.07" rx="6" stroke={BLU} strokeWidth={1}/>
        <line x1="15" y1="22" x2="145" y2="22" stroke={BLU} strokeWidth={0.8} strokeDasharray="2,3"/>
        <line x1="15" y1="36" x2="145" y2="36" stroke={BLU} strokeWidth={0.8} strokeDasharray="2,3"/>
        <line x1="15" y1="50" x2="145" y2="50" stroke={BLU} strokeWidth={0.8} strokeDasharray="2,3"/>
        <line x1="15" y1="64" x2="145" y2="64" stroke={BLU} strokeWidth={0.8} strokeDasharray="2,3"/>
        <text x="10" y="16" fontSize="8" fill={NEU}  fontFamily="Inter,sans-serif">תאריך  |  מניה  |  כניסה  |  יציאה</text>
        <text x="10" y="30" fontSize="7" fill={UP}   fontFamily="Heebo,sans-serif">AAPL +2.4R ✓ פריצה + נפח</text>
        <text x="10" y="44" fontSize="7" fill={DOWN} fontFamily="Heebo,sans-serif">TSLA -1R ✗ סטופ פוגע מוקדם</text>
        <text x="10" y="58" fontSize="7" fill={UP}   fontFamily="Heebo,sans-serif">MSFT +3.1R ✓ Morning Star</text>
        <text x="10" y="72" fontSize="7" fill={ORAN} fontFamily="Heebo,sans-serif">NVDA דלגתי — R:R 1:1 לא מספיק</text>
      </svg>
    ),
  },
]

// ── Pattern Card (candlestick) ────────────────────────────────────────────────
function PatternCard({ p, C, isHe }) {
  const [open, setOpen] = useState(false)
  const ti = {
    bullish:{ label:isHe?'📈 שורי':'📈 Bullish',   bg:'#26a65b18',border:'#26a65b44',color:UP },
    bearish:{ label:isHe?'📉 דובי':'📉 Bearish',   bg:'#e5393518',border:'#e5393544',color:DOWN },
    neutral:{ label:isHe?'⚖️ ניטרלי':'⚖️ Neutral', bg:'#8b949e18',border:'#8b949e44',color:NEU },
  }
  const t = ti[p.type]
  return (
    <div onClick={() => setOpen(v => !v)}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', overflow:'hidden', cursor:'pointer' }}>
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
          background:C.bg, borderRadius:'8px', padding:'8px', border:`1px solid ${C.border}`, minWidth:56 }}>
          {p.svg}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
            <span style={{ fontSize:'15px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif' }}>{p.nameHe}</span>
            <span style={{ fontSize:'11px', color:C.muted, fontFamily:'Inter,sans-serif' }}>{p.nameEn}</span>
            <span style={{ fontSize:'11px', fontWeight:600, fontFamily:'Inter,sans-serif', padding:'2px 8px', borderRadius:'20px',
              background:t.bg, border:`1px solid ${t.border}`, color:t.color }}>{t.label}</span>
          </div>
          <p style={{ fontSize:'12px', color:C.muted, fontFamily:'Heebo,sans-serif', margin:0, lineHeight:1.5,
            display:'-webkit-box', WebkitLineClamp:open?'unset':2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {p.descHe}
          </p>
        </div>
        <div style={{ flexShrink:0, color:C.muted, fontSize:'16px', transition:'transform .2s', transform:open?'rotate(180deg)':'none' }}>▾</div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 16px', background:C.bg }}>
          <p style={{ fontSize:'13px', color:C.text, fontFamily:'Heebo,sans-serif', lineHeight:1.7, margin:'0 0 10px' }}>{p.descHe}</p>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'10px 12px', borderRadius:'8px',
            background:t.bg, border:`1px solid ${t.border}` }}>
            <span style={{ fontSize:'14px', flexShrink:0, marginTop:'1px' }}>💡</span>
            <span style={{ fontSize:'12px', color:t.color, fontFamily:'Heebo,sans-serif', fontWeight:600, lineHeight:1.5 }}>{p.tipHe}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Chart Pattern Card ────────────────────────────────────────────────────────
function ChartPatternCard({ p, C, isHe }) {
  const [open, setOpen] = useState(false)
  const ti = {
    bullish:{ label:isHe?'📈 שורי':'📈 Bullish',   bg:'#26a65b18',border:'#26a65b44',color:UP },
    bearish:{ label:isHe?'📉 דובי':'📉 Bearish',   bg:'#e5393518',border:'#e5393544',color:DOWN },
    neutral:{ label:isHe?'⚖️ ניטרלי':'⚖️ Neutral', bg:'#8b949e18',border:'#8b949e44',color:NEU },
  }
  const t = ti[p.type]
  return (
    <div onClick={() => setOpen(v => !v)}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', overflow:'hidden', cursor:'pointer' }}>
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{ flexShrink:0, background:C.bg, borderRadius:'8px', padding:'8px',
          border:`1px solid ${C.border}` }}>
          {p.svg}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
            <span style={{ fontSize:'15px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif' }}>{p.nameHe}</span>
            <span style={{ fontSize:'11px', color:C.muted, fontFamily:'Inter,sans-serif' }}>{p.nameEn}</span>
            <span style={{ fontSize:'11px', fontWeight:600, fontFamily:'Inter,sans-serif', padding:'2px 8px', borderRadius:'20px',
              background:t.bg, border:`1px solid ${t.border}`, color:t.color }}>{t.label}</span>
          </div>
          <p style={{ fontSize:'12px', color:C.muted, fontFamily:'Heebo,sans-serif', margin:0, lineHeight:1.5,
            display:'-webkit-box', WebkitLineClamp:open?'unset':2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {p.descHe}
          </p>
        </div>
        <div style={{ flexShrink:0, color:C.muted, fontSize:'16px', transition:'transform .2s', transform:open?'rotate(180deg)':'none' }}>▾</div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 16px', background:C.bg }}>
          <p style={{ fontSize:'13px', color:C.text, fontFamily:'Heebo,sans-serif', lineHeight:1.7, margin:'0 0 10px' }}>{p.descHe}</p>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'10px 12px', borderRadius:'8px',
            background:t.bg, border:`1px solid ${t.border}` }}>
            <span style={{ fontSize:'14px', flexShrink:0, marginTop:'1px' }}>💡</span>
            <span style={{ fontSize:'12px', color:t.color, fontFamily:'Heebo,sans-serif', fontWeight:600, lineHeight:1.5 }}>{p.tipHe}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Guide Card (indicators + risk management) ────────────────────────────────
function GuideCard({ p, C, isHe }) {
  const [open, setOpen] = useState(false)
  const typeInfo = {
    momentum:   { label: isHe ? '⚡ מומנטום'    : '⚡ Momentum',    color: ORAN, bg: '#f59e0b18', border: '#f59e0b44' },
    trend:      { label: isHe ? '📊 טרנד'        : '📊 Trend',       color: BLU,  bg: '#3b6ff518', border: '#3b6ff544' },
    volatility: { label: isHe ? '🌊 תנודתיות'   : '🌊 Volatility',  color: PURP, bg: '#8b5cf618', border: '#8b5cf644' },
    volume:     { label: isHe ? '📦 נפח'          : '📦 Volume',      color: TEAL, bg: '#06b6d418', border: '#06b6d444' },
    risk:       { label: isHe ? '🛡️ ניהול סיכון' : '🛡️ Risk Mgmt',  color: '#ef4444', bg: '#ef444418', border: '#ef444444' },
  }
  const t = typeInfo[p.type] || typeInfo.risk
  return (
    <div onClick={() => setOpen(v => !v)}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', overflow:'hidden', cursor:'pointer' }}>
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{ flexShrink:0, background:C.bg, borderRadius:'8px', padding:'8px', border:`1px solid ${C.border}` }}>
          {p.svg}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
            <span style={{ fontSize:'15px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif' }}>{p.nameHe}</span>
            <span style={{ fontSize:'11px', color:C.muted, fontFamily:'Inter,sans-serif' }}>{p.nameEn}</span>
            <span style={{ fontSize:'11px', fontWeight:600, fontFamily:'Inter,sans-serif', padding:'2px 8px', borderRadius:'20px',
              background:t.bg, border:`1px solid ${t.border}`, color:t.color }}>{t.label}</span>
          </div>
          <p style={{ fontSize:'12px', color:C.muted, fontFamily:'Heebo,sans-serif', margin:0, lineHeight:1.5,
            display:'-webkit-box', WebkitLineClamp:open?'unset':2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {p.descHe}
          </p>
        </div>
        <div style={{ flexShrink:0, color:C.muted, fontSize:'16px', transition:'transform .2s', transform:open?'rotate(180deg)':'none' }}>▾</div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 16px', background:C.bg }}>
          <p style={{ fontSize:'13px', color:C.text, fontFamily:'Heebo,sans-serif', lineHeight:1.7, margin:'0 0 10px' }}>{p.descHe}</p>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'10px 12px', borderRadius:'8px',
            background:t.bg, border:`1px solid ${t.border}` }}>
            <span style={{ fontSize:'14px', flexShrink:0, marginTop:'1px' }}>💡</span>
            <span style={{ fontSize:'12px', color:t.color, fontFamily:'Heebo,sans-serif', fontWeight:600, lineHeight:1.5 }}>{p.tipHe}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ emoji, title, sub, color, C }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
      <div style={{ width:4, height:36, borderRadius:2, background:color, flexShrink:0 }}/>
      <div>
        <h2 style={{ fontSize:'18px', fontWeight:800, color:C.text, fontFamily:'Heebo,sans-serif', margin:0 }}>
          {emoji} {title}
        </h2>
        {sub && <p style={{ fontSize:'12px', color:C.muted, fontFamily:'Heebo,sans-serif', margin:'2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InfoPage() {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const isHe   = lang === 'he'

  const [candleFilter, setCandleFilter] = useState('all')
  const [chartFilter,  setChartFilter]  = useState('all')

  const C = {
    bg:     isDark ? '#161b22' : '#ffffff',
    card:   isDark ? '#0d1117' : '#f6f8fa',
    border: isDark ? '#30363d' : '#d0d7de',
    text:   isDark ? '#e6edf3' : '#1c2128',
    muted:  isDark ? '#8b949e' : '#57606a',
  }

  const filteredCandles = candleFilter === 'all' ? PATTERNS : PATTERNS.filter(p => p.type === candleFilter)
  const filteredCharts  = chartFilter  === 'all' ? CHART_PATTERNS : CHART_PATTERNS.filter(p => p.type === chartFilter)

  const cCounts = { all:PATTERNS.length, bullish:PATTERNS.filter(p=>p.type==='bullish').length, bearish:PATTERNS.filter(p=>p.type==='bearish').length, neutral:PATTERNS.filter(p=>p.type==='neutral').length }
  const gCounts = { all:CHART_PATTERNS.length, bullish:CHART_PATTERNS.filter(p=>p.type==='bullish').length, bearish:CHART_PATTERNS.filter(p=>p.type==='bearish').length, neutral:CHART_PATTERNS.filter(p=>p.type==='neutral').length }

  function FilterBar({ counts, value, onChange }) {
    return (
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
        {[
          { key:'all',     label:isHe?`הכל (${counts.all})`:`All (${counts.all})`,                       bg:BLU },
          { key:'bullish', label:isHe?`📈 שוריים (${counts.bullish})`:`📈 Bullish (${counts.bullish})`, bg:UP  },
          { key:'bearish', label:isHe?`📉 דוביים (${counts.bearish})`:`📉 Bearish (${counts.bearish})`, bg:DOWN },
          { key:'neutral', label:isHe?`⚖️ ניטרלי (${counts.neutral})`:`⚖️ Neutral (${counts.neutral})`, bg:NEU  },
        ].map(btn => (
          <button key={btn.key} onClick={() => onChange(btn.key)}
            style={{ padding:'7px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:600,
              fontFamily:'Heebo,sans-serif', background:value===btn.key?btn.bg:C.card, color:value===btn.key?'#fff':C.muted,
              border:`1px solid ${value===btn.key?btn.bg:C.border}`, transition:'all .15s' }}>
            {btn.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background:isDark?'#0d1117':'#f0f2f5' }}>
      <TopBar />
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-6 py-6">

        {/* Page header */}
        <div style={{ background:isDark?'linear-gradient(135deg,#161b22 0%,#0d1117 100%)':'linear-gradient(135deg,#fff 0%,#f0f4ff 100%)',
          border:`1px solid ${C.border}`, borderRadius:'14px', padding:'28px 32px', marginBottom:'28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'12px' }}>
            <span style={{ fontSize:'36px' }}>📊</span>
            <div>
              <h1 style={{ fontSize:'26px', fontWeight:800, color:C.text, fontFamily:'Heebo,sans-serif', margin:0 }}>
                {isHe ? 'מדריך דפוסי מסחר מלא' : 'Complete Trading Patterns Guide'}
              </h1>
              <p style={{ fontSize:'14px', color:C.muted, fontFamily:'Heebo,sans-serif', margin:'4px 0 0' }}>
                {isHe
                  ? `${PATTERNS.length} דפוסי נרות · ${CHART_PATTERNS.length} דפוסי גרף · ${INDICATORS.length} מדדים טכניים · ${RISK_MGMT.length} ניהול סיכונים — לחץ על כל כרטיס להסבר מלא`
                  : `${PATTERNS.length} candlestick · ${CHART_PATTERNS.length} chart patterns · ${INDICATORS.length} indicators · ${RISK_MGMT.length} risk topics`}
              </p>
            </div>
          </div>
          <div style={{ background:isDark?'#1e2630':'#eef2ff', borderRadius:'10px', padding:'14px 18px',
            border:`1px solid ${isDark?'#30363d':'#c7d2fe'}` }}>
            <p style={{ fontSize:'13px', color:C.text, fontFamily:'Heebo,sans-serif', lineHeight:1.8, margin:0 }}>
              {isHe
                ? '🕯️ נרות יפניים פותחו על ידי סוחרי אורז יפניים במאה ה-18 ונחשבים לכלי הניתוח הטכני הנפוץ ביותר. כל נר מייצג את מאבק הכוחות בין קונים למוכרים. דפוסי הגרף מייצגים מבנים גדולים יותר המצביעים על נקודות כניסה ויציאה אסטרטגיות.'
                : '🕯️ Japanese candlesticks + chart patterns combined give the most powerful signals in technical analysis. Click any card to expand.'}
            </p>
          </div>
        </div>

        {/* ══ SECTION 1: Candlestick Patterns ══ */}
        <div style={{ marginBottom:'40px' }}>
          <SectionHeader emoji="🕯️"
            title={isHe ? 'דפוסי נרות יפניים' : 'Japanese Candlestick Patterns'}
            sub={isHe ? `${PATTERNS.length} דפוסים — לחץ על כרטיס להסבר מלא` : `${PATTERNS.length} patterns`}
            color={BLU} C={C}
          />
          <FilterBar counts={cCounts} value={candleFilter} onChange={setCandleFilter} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(460px,1fr))', gap:'10px' }}>
            {filteredCandles.map(p => <PatternCard key={p.id} p={p} C={C} isHe={isHe}/>)}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:2, background:`linear-gradient(90deg,transparent,${C.border},transparent)`, margin:'0 0 36px' }}/>

        {/* ══ SECTION 2: Chart Patterns ══ */}
        <div style={{ marginBottom:'32px' }}>
          <SectionHeader emoji="📈"
            title={isHe ? 'דפוסי גרף — נקודות כניסה' : 'Chart Patterns — Entry Points'}
            sub={isHe ? `${CHART_PATTERNS.length} דפוסים עם תמונה ויזואלית לכל אחד` : `${CHART_PATTERNS.length} patterns with visual illustrations`}
            color='#f59e0b' C={C}
          />
          <div style={{ background:isDark?'#1e263088':'#fff7ed88', borderRadius:'10px', padding:'12px 16px',
            border:`1px solid ${isDark?'#30363d':'#fed7aa'}`, marginBottom:'16px' }}>
            <p style={{ fontSize:'12px', color:C.text, fontFamily:'Heebo,sans-serif', lineHeight:1.7, margin:0 }}>
              {isHe
                ? '📐 דפוסי גרף הם מבנים שנוצרים על פני ימים עד חודשים. הם מצביעים על אזורי תמיכה והתנגדות חזקים ונקודות כניסה אסטרטגיות. הנרות הבודדים אומרים "מה קרה היום" — הגרף הכולל אומר "לאן אנחנו הולכים".'
                : '📐 Chart patterns form over days to months and reveal strategic entry/exit points with high accuracy.'}
            </p>
          </div>
          <FilterBar counts={gCounts} value={chartFilter} onChange={setChartFilter} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(460px,1fr))', gap:'10px' }}>
            {filteredCharts.map(p => <ChartPatternCard key={p.id} p={p} C={C} isHe={isHe}/>)}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:2, background:`linear-gradient(90deg,transparent,${C.border},transparent)`, margin:'0 0 36px' }}/>

        {/* ══ SECTION 3: Technical Indicators ══ */}
        <div style={{ marginBottom:'40px' }}>
          <SectionHeader emoji="📉"
            title={isHe ? 'מדדים טכניים — קריאת אותות' : 'Technical Indicators — Reading Signals'}
            sub={isHe ? `${INDICATORS.length} מדדים עם הסבר מלא ותמונה` : `${INDICATORS.length} indicators with visual illustrations`}
            color={ORAN} C={C}
          />
          <div style={{ background:isDark?'#26200888':'#fffbeb88', borderRadius:'10px', padding:'12px 16px',
            border:`1px solid ${isDark?'#403010':'#fde68a'}`, marginBottom:'16px' }}>
            <p style={{ fontSize:'12px', color:C.text, fontFamily:'Heebo,sans-serif', lineHeight:1.7, margin:0 }}>
              {isHe
                ? '📊 מדדים טכניים ממירים נתוני מחיר ונפח לאות ויזואלי. הם לא מנבאים עתיד — הם מציגים הסתברויות. שלב תמיד מספר מדדים לאישור הדדי. לחץ על כל כרטיס לטיפ מקצועי.'
                : '📊 Technical indicators transform price and volume data into visual signals. Always combine multiple indicators for confirmation before entering a trade.'}
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(460px,1fr))', gap:'10px' }}>
            {INDICATORS.map(p => <GuideCard key={p.id} p={p} C={C} isHe={isHe}/>)}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:2, background:`linear-gradient(90deg,transparent,${C.border},transparent)`, margin:'0 0 36px' }}/>

        {/* ══ SECTION 4: Risk Management ══ */}
        <div style={{ marginBottom:'32px' }}>
          <SectionHeader emoji="🛡️"
            title={isHe ? 'ניהול סיכונים — הישרדות בשוק' : 'Risk Management — Market Survival'}
            sub={isHe ? `${RISK_MGMT.length} עקרונות לניהול הון מקצועי` : `${RISK_MGMT.length} professional capital management principles`}
            color='#ef4444' C={C}
          />
          <div style={{ background:isDark?'#2a181888':'#fff1f188', borderRadius:'10px', padding:'12px 16px',
            border:`1px solid ${isDark?'#4d2020':'#fecaca'}`, marginBottom:'16px' }}>
            <p style={{ fontSize:'12px', color:C.text, fontFamily:'Heebo,sans-serif', lineHeight:1.7, margin:0 }}>
              {isHe
                ? '🛡️ 90% מהסוחרים מפסידים לא בגלל ניתוח לקוי — אלא בגלל ניהול סיכונים גרוע. ניהול הון מקצועי הוא ההבדל בין סוחר לבין מהמר. הגדר את הסיכון לפני כל כניסה לעסקה.'
                : '🛡️ 90% of traders lose not due to bad analysis — but due to poor risk management. Professional capital management is the difference between a trader and a gambler. Define risk before every trade.'}
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(460px,1fr))', gap:'10px' }}>
            {RISK_MGMT.map(p => <GuideCard key={p.id} p={p} C={C} isHe={isHe}/>)}
          </div>
        </div>

        {/* Bottom disclaimer */}
        <div style={{ padding:'16px 20px', background:C.card, borderRadius:'10px', border:`1px solid ${C.border}` }}>
          <p style={{ fontSize:'12px', color:C.muted, fontFamily:'Heebo,sans-serif', lineHeight:1.7, margin:0, textAlign:isHe?'right':'left' }}>
            ⚠️ {isHe
              ? 'דפוסים אלו הם כלי עזר לניתוח טכני ואינם ערובה לתוצאות. תמיד שלב עם נפח, RSI, MA, ורמות S/R. אין לראות במידע זה המלצת השקעה.'
              : 'These patterns are technical analysis tools and do not guarantee outcomes. Always combine with volume, RSI, MA, and S/R levels. Not investment advice.'}
          </p>
        </div>
      </main>
    </div>
  )
}
