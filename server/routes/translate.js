import { Router } from 'express'
import { execFile } from 'child_process'

const router = Router()

const CURL_EXE = process.platform === 'win32'
  ? 'C:\\Windows\\System32\\curl.exe'
  : 'curl'

function curlGet(url) {
  return new Promise((resolve, reject) => {
    execFile(CURL_EXE, ['-sS', '--max-time', '10', '-L', url],
      { timeout: 15000 },
      (err, stdout) => {
        if (err) return reject(new Error(err.message))
        resolve(stdout || '')
      }
    )
  })
}

// Split text into chunks of ~450 chars on sentence/word boundaries
function splitChunks(text, maxLen = 450) {
  const chunks = []
  let remaining = text.trim()
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf('. ', maxLen)
    if (cut < 100) cut = remaining.lastIndexOf(' ', maxLen)
    if (cut < 10)  cut = maxLen
    chunks.push(remaining.slice(0, cut + 1).trim())
    remaining = remaining.slice(cut + 1).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks
}

// Translate a single chunk via MyMemory (free, no key, 500 chars/req)
async function translateChunk(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|he`
  const out  = await curlGet(url)
  const json = JSON.parse(out)
  if (json.responseStatus === 200) {
    return json.responseData.translatedText || text
  }
  throw new Error(json.responseMessage || 'Translation failed')
}

router.get('/', async (req, res) => {
  try {
    const { text } = req.query
    if (!text || text.length < 2) return res.json({ translated: '' })

    const chunks     = splitChunks(text, 450)
    const translated = await Promise.all(chunks.map(c => translateChunk(c)))
    res.json({ translated: translated.join(' ') })
  } catch (err) {
    console.error('translate error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
