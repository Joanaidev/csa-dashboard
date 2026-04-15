const { initializeApp, getApps } = require('firebase/app')
const { getFirestore, collection, getDocs, setDoc, deleteDoc, doc } = require('firebase/firestore')

// All credentials via Vercel environment variables - never hardcoded
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
}

function getDb() {
  if (!firebaseConfig.apiKey) return null
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  return getFirestore(app)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const db = getDb()

  if (req.method === 'GET') {
    // Try Firestore first, fall back to clients.json
    if (db) {
      try {
        const snap = await getDocs(collection(db, 'dashboard_clients'))
        const clients = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        if (clients.length > 0) return res.status(200).json({ clients, source: 'firestore' })
      } catch (e) { console.warn('Firestore read failed:', e.message) }
    }
    const fs = require('fs'), path = require('path')
    try {
      const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'clients.json'), 'utf8'))
      return res.status(200).json({ clients: data, source: 'file' })
    } catch { return res.status(200).json({ clients: [], source: 'empty' }) }
  }

  if (req.method === 'POST') {
    if (!db) return res.status(500).json({ error: 'Firebase not configured' })
    try {
      const client = req.body
      if (!client.id) client.id = Date.now().toString()
      client.updatedAt = new Date().toISOString()
      await setDoc(doc(db, 'dashboard_clients', client.id), client, { merge: true })
      return res.status(200).json({ ok: true, client })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    if (!db) return res.status(500).json({ error: 'Firebase not configured' })
    try {
      const { id } = req.query
      await deleteDoc(doc(db, 'dashboard_clients', id))
      return res.status(200).json({ ok: true })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
