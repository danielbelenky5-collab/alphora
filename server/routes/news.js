import { Router } from 'express'
import { execFile } from 'child_process'
import NodeCache from 'node-cache'

const router = Router()
const cache  = new NodeCache({ stdTTL: 90 })
const CURL   = process.platform === 'win32' ? 'C:\\Windows\\System32\\curl.exe' : 'curl'

function curlGet(url) {
  return new Promise((resolve, reject) => {
    execFile(CURL, ['-sS', '--max-time', '10', '-L',
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      url],
      { timeout: 15000 },
      (err, stdout) => {
        if (err) return reject(new Error(err.message))
        resolve(stdout || '')
      }
    )
  })
}

function stripCDATA(s) {
  if (!s) return ''
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim()
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? stripCDATA(m[1]) : ''
}

function parseRSS(xml, sourceName) {
  const items = []
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m
  while ((m = re.exec(xml)) !== null && items.length < 25) {
    const content = m[1]
    const title = extractTag(content, 'title')
    if (!title) continue
    // link: try <link> tag or <guid isPermaLink>
    let link = extractTag(content, 'link')
    if (!link) link = extractTag(content, 'guid')
    const pubDate    = extractTag(content, 'pubDate') || extractTag(content, 'dc:date')
    const description = extractTag(content, 'description').slice(0, 200)
    items.push({
      title,
      link,
      pubDate:    pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      source:     sourceName,
      description,
    })
  }
  return items
}

const RSS_SOURCES = {
  yahoo:       (sym) => `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${sym || '%5EGSPC'}&region=US&lang=en-US`,
  cnbc:        ()    => 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114',
  marketwatch: ()    => 'https://feeds.marketwatch.com/marketwatch/topstories/',
  reuters:     ()    => 'https://feeds.reuters.com/reuters/businessNews',
}

// GET /api/news?sources=yahoo,cnbc&symbol=AAPL
router.get('/', async (req, res) => {
  try {
    const { symbol = '', sources = 'yahoo,cnbc,marketwatch' } = req.query
    const srcList = sources.split(',').map(s => s.trim()).filter(Boolean)
    const cacheKey = `news:${srcList.join('-')}:${symbol}`
    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    const fetches = srcList.map(async src => {
      const urlFn = RSS_SOURCES[src]
      if (!urlFn) return []
      try {
        const xml = await curlGet(urlFn(symbol))
        return parseRSS(xml, src)
      } catch (e) {
        console.warn(`RSS fetch failed [${src}]:`, e.message.slice(0, 60))
        return []
      }
    })

    const results = await Promise.all(fetches)
    const all = results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    cache.set(cacheKey, all)
    res.json(all)
  } catch (err) {
    console.error('news error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/news/calendar — ForexFactory economic calendar
router.get('/calendar', async (req, res) => {
  try {
    const cacheKey = 'eco-calendar'
    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    let events = []
    for (const week of ['thisweek', 'nextweek']) {
      try {
        const url  = `https://nfs.faireconomy.media/ff_calendar_${week}.json`
        const out  = await curlGet(url)
        const json = JSON.parse(out)
        if (Array.isArray(json)) events.push(...json)
      } catch (e) {
        console.warn(`Calendar fetch failed [${week}]:`, e.message.slice(0, 60))
      }
    }

    // Filter USD events with High/Medium impact
    const filtered = events
      .filter(e => e.country === 'USD' && ['High', 'Medium'].includes(e.impact))
      .map(e => ({
        date:     e.date,
        time:     e.time,
        title:    e.title,
        impact:   e.impact,
        forecast: e.forecast || null,
        previous: e.previous || null,
        actual:   e.actual   || null,
        country:  e.country,
      }))
      .sort((a, b) => new Date(a.date + ' ' + (a.time || '00:00')) - new Date(b.date + ' ' + (b.time || '00:00')))

    cache.set(cacheKey, filtered, 3600)
    res.json(filtered)
  } catch (err) {
    console.error('calendar error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
