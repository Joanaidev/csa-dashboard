const { initializeApp, getApps } = require('firebase/app')
const { getFirestore, collection, getDocs, setDoc, deleteDoc, doc } = require('firebase/firestore')

const firebaseConfig = {
  apiKey: "AIzaSyBJVOTUw5mpkGxKgqAjT6CUb5Sn-kvwVZE",
  authDomain: "solutions-team-hub.firebaseapp.com",
  projectId: "solutions-team-hub",
  storageBucket: "solutions-team-hub.firebasestorage.app",
  messagingSenderId: "167673970172",
  appId: "1:167673970172:web:6d18892aefc3c5601dc679"
}

function getDb() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  return getFirestore(app)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const db = getDb()
  const col = collection(db, 'dashboard_clients')

  if (req.method === 'GET') {
    try {
      const snap = await getDocs(col)
      const clients = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (clients.length === 0) {
        const fs = require('fs'), path = require('path')
        try {
          const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'clients.json'), 'utf8'))
          return res.status(200).json({ clients: data, source: 'file' })
        } catch { return res.status(200).json({ clients: [], source: 'empty' }) }
      }
      return res.status(200).json({ clients, source: 'firestore' })
    } catch (e) {
      const fs = require('fs'), path = require('path')
      try {
        const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'clients.json'), 'utf8'))
        return res.status(200).json({ clients: data, source: 'file' })
      } catch { return res.status(500).json({ error: e.message }) }
    }
  }

  if (req.method === 'POST') {
    try {
      const client = req.body
      if (!client.id) client.id = Date.now().toString()
      client.updatedAt = new Date().toISOString()
      await setDoc(doc(db, 'dashboard_clients', client.id), client, { merge: true })
      return res.status(200).json({ ok: true, client })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Missing id' })
      await deleteDoc(doc(db, 'dashboard_clients', id))
      return res.status(200).json({ ok: true })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
