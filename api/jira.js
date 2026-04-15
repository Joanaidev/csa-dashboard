module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const JIRA_EMAIL = process.env.JIRA_EMAIL
  const JIRA_TOKEN = process.env.JIRA_TOKEN

  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return res.status(500).json({ error: 'Missing JIRA_EMAIL or JIRA_TOKEN environment variables' })
  }

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
  const jql = req.query.jql || 'project in (CIB, SAWP) AND statusCategory != Done ORDER BY updated DESC'
  const url = `https://bitwave-dev.atlassian.net/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=200&fields=summary,status,priority,project,created,updated,assignee`

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    })
    if (!response.ok) {
      const text = await response.text()
      return res.status(response.status).json({ error: `Jira error ${response.status}`, detail: text.slice(0, 300) })
    }
    return res.status(200).json(await response.json())
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
