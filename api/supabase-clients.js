const SUPABASE_URL = 'https://ozkfingocfzrfneijtxc.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96a2ZpbmdvY2Z6cmZuZWlqdHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA0OTkwOCwiZXhwIjoyMDkyNjI1OTA4fQ.1IJ4zl-eo2fDoTQj_RNXePGIzrKwOcwpjkNdkSzh1kI'

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET - load all clients
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=*&order=name.asc`, { headers })
      const data = await r.json()
      return res.status(200).json(data)
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  // POST - upsert client
  if (req.method === 'POST') {
    try {
      const body = req.body
      body.updated_at = new Date().toISOString()
      const r = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(body)
      })
      const data = await r.json()
      return res.status(200).json(data)
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  // PATCH - update specific fields
  if (req.method === 'PATCH') {
    try {
      const { id, ...updates } = req.body
      updates.updated_at = new Date().toISOString()
      const r = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      })
      return res.status(200).json({ ok: true })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  // DELETE - hard delete
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query
      await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${id}`, { method: 'DELETE', headers })
      return res.status(200).json({ ok: true })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
