const fs = require('fs')
const path = require('path')

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const data = fs.readFileSync(path.join(process.cwd(), 'clients.json'), 'utf8')
    return res.status(200).json(JSON.parse(data))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
