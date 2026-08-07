#!/usr/bin/env node
/**
 * Serves hello-world + POST /ingest (logs snapshot to this terminal).
 * Nothing goes to intentLM — this is *your* backend receiving what the browser sends.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3456)
const ROOT = __dirname

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'POST' && url.pathname === '/ingest') {
    try {
      const raw = await readBody(req)
      const snap = JSON.parse(raw.toString('utf8') || '{}')

      console.log('\n──────── POST /ingest (your backend) ────────')
      console.log(new Date().toISOString())
      console.log('visitorId:     ', snap.visitorId ?? '(none)')
      console.log('sessionId:     ', snap.sessionId ?? '(none)')
      console.log('tokens:        ', snap.tokens)
      console.log('timeDeltasMs:  ', snap.timeDeltasMs)
      if (Array.isArray(snap.events)) {
        console.log('events:')
        for (const e of snap.events) {
          console.log(
            `  ${String(e.token).padStart(4)}  ${String(e.timeDeltaMs).padStart(6)}ms  ${e.label}`,
          )
        }
      }
      console.log('full JSON:')
      console.log(JSON.stringify(snap, null, 2))
      console.log('─────────────────────────────────────────────\n')

      send(res, 200, JSON.stringify({ ok: true }), 'application/json')
    } catch (err) {
      console.error('ingest error:', err)
      send(res, 400, JSON.stringify({ ok: false, error: String(err) }), 'application/json')
    }
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed')
    return
  }

  let rel = decodeURIComponent(url.pathname)
  if (rel === '/' || rel === '/pricing' || rel === '/checkout') rel = '/index.html'
  const filePath = path.normalize(path.join(ROOT, rel))
  if (!filePath.startsWith(ROOT)) {
    send(res, 403, 'Forbidden')
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found')
      return
    }
    const ext = path.extname(filePath)
    send(res, 200, data, MIME[ext] || 'application/octet-stream')
  })
})

server.listen(PORT, () => {
  console.log(`hello-world → http://localhost:${PORT}`)
  console.log('  #capture  — checklist   #backend — pull + POST /ingest (logs here)')
})

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: PORT=3458 npm start`)
    process.exit(1)
  }
  throw err
})
