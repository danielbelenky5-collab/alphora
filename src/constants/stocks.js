export const STOCKS = [
  // טכנולוגיה
  { symbol: 'AAPL',  nameEn: 'Apple',           nameHe: 'אפל',           sector: 'טכנולוגיה' },
  { symbol: 'MSFT',  nameEn: 'Microsoft',        nameHe: 'מיקרוסופט',     sector: 'טכנולוגיה' },
  { symbol: 'GOOGL', nameEn: 'Alphabet (Google)',nameHe: 'אלפבית (גוגל)', sector: 'טכנולוגיה' },
  { symbol: 'AMZN',  nameEn: 'Amazon',           nameHe: 'אמזון',         sector: 'טכנולוגיה' },
  { symbol: 'NVDA',  nameEn: 'NVIDIA',           nameHe: 'אנבידיה',       sector: 'טכנולוגיה' },
  { symbol: 'META',  nameEn: 'Meta',             nameHe: 'מטא',           sector: 'טכנולוגיה' },
  { symbol: 'TSLA',  nameEn: 'Tesla',            nameHe: 'טסלה',          sector: 'טכנולוגיה' },
  { symbol: 'AMD',   nameEn: 'AMD',              nameHe: 'AMD',           sector: 'טכנולוגיה' },
  { symbol: 'ORCL',  nameEn: 'Oracle',           nameHe: 'אורקל',         sector: 'טכנולוגיה' },
  { symbol: 'ADBE',  nameEn: 'Adobe',            nameHe: 'אדובי',         sector: 'טכנולוגיה' },
  // פיננסים
  { symbol: 'JPM',   nameEn: 'JPMorgan Chase',   nameHe: 'ג\'יי-פי מורגן',sector: 'פיננסים' },
  { symbol: 'GS',    nameEn: 'Goldman Sachs',    nameHe: 'גולדמן זאקס',  sector: 'פיננסים' },
  { symbol: 'BAC',   nameEn: 'Bank of America',  nameHe: 'בנק אוף אמריקה',sector: 'פיננסים' },
  { symbol: 'V',     nameEn: 'Visa',             nameHe: 'ויזה',          sector: 'פיננסים' },
  { symbol: 'MA',    nameEn: 'Mastercard',       nameHe: 'מאסטרקארד',     sector: 'פיננסים' },
  // בריאות
  { symbol: 'JNJ',   nameEn: 'Johnson & Johnson',nameHe: 'ג\'ונסון אנד ג\'ונסון', sector: 'בריאות' },
  { symbol: 'PFE',   nameEn: 'Pfizer',           nameHe: 'פייזר',         sector: 'בריאות' },
  { symbol: 'UNH',   nameEn: 'UnitedHealth',     nameHe: 'יונייטד הלת',   sector: 'בריאות' },
  { symbol: 'ABBV',  nameEn: 'AbbVie',           nameHe: 'אבוויי',        sector: 'בריאות' },
  // אנרגיה
  { symbol: 'XOM',   nameEn: 'ExxonMobil',       nameHe: 'אקסון מוביל',   sector: 'אנרגיה' },
  { symbol: 'CVX',   nameEn: 'Chevron',          nameHe: 'שברון',         sector: 'אנרגיה' },
  // צריכה
  { symbol: 'WMT',   nameEn: 'Walmart',          nameHe: 'וולמארט',       sector: 'צריכה' },
  { symbol: 'DIS',   nameEn: 'Disney',           nameHe: 'דיסני',         sector: 'צריכה' },
  { symbol: 'NKE',   nameEn: 'Nike',             nameHe: 'נייקי',         sector: 'צריכה' },
  { symbol: 'SBUX',  nameEn: 'Starbucks',        nameHe: 'סטארבקס',       sector: 'צריכה' },
  // תעשייה
  { symbol: 'BA',    nameEn: 'Boeing',           nameHe: 'בואינג',        sector: 'תעשייה' },
  { symbol: 'CAT',   nameEn: 'Caterpillar',      nameHe: 'קטרפילר',       sector: 'תעשייה' },
  { symbol: 'GE',    nameEn: 'GE Aerospace',     nameHe: 'ג\'י-א',        sector: 'תעשייה' },
  // קריפטו / אחר
  { symbol: 'COIN',  nameEn: 'Coinbase',         nameHe: 'קוינבייס',      sector: 'קריפטו' },
  { symbol: 'MSTR',  nameEn: 'MicroStrategy',    nameHe: 'מייקרוסטרטג\'י',sector: 'קריפטו' },
]

export const STOCK_SYMBOLS = STOCKS.map(s => s.symbol)

export function getStock(symbol) {
  return STOCKS.find(s => s.symbol === symbol)
}
