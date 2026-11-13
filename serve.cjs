const { createServer } = require('node:http')
const { readFile } = require('node:fs/promises')
const path = require('node:path')

const root = path.resolve(__dirname)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg'
}
const host = '127.0.0.1'
const port = Number(process.argv[2] || 8080)
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://' + host)
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
    const file = path.resolve(root, '.' + pathname)
    const type = types[path.extname(file)]
    if (!file.startsWith(root + path.sep) || !type) throw new Error('Not found')
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(data)
  } catch {
    res.writeHead(404).end('Not found')
  }
}).listen(port, host, () => console.log('http://' + host + ':' + port + '/'))
