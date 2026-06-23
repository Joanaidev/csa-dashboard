const SUPABASE_URL = 'https://ozkfingocfzrfneijtxc.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY
const BITWAVE_DOMAIN = 'bitwave.io'

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if(req.method === 'GET') return res.status(200).send('Slack events endpoint active')

  if(req.method !== 'POST') return res.status(405).end()

  const body = req.body

  // Slack URL verification challenge
  if(body.type === 'url_verification') {
    return res.status(200).json({ challenge: body.challenge })
  }

  // Handle message events
  if(body.event && (body.event.type === 'message' || body.event.type === 'message.channels' || body.event.type === 'message.groups')) {
    const event = body.event

    // Ignore bot messages, message edits, deletions
    if(event.bot_id || event.subtype) return res.status(200).json({ ok: true })

    const channelId = event.channel
    const userId = event.user

    // Get user info to check if they are bitwave team
    try {
      const userRes = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
        headers: { 'Authorization': `Bearer ${process.env.SLACK_TOKEN}` }
      })
      const userData = await userRes.json()

      // If bitwave team member posted - ignore
      if(userData.user?.profile?.email?.endsWith(BITWAVE_DOMAIN)) {
        return res.status(200).json({ ok: true, ignored: 'bitwave team member' })
      }

      // External client posted - find which client has this channel ID
      const clientRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?slack_channel_id=eq.${channelId}&select=id,name`, {
        headers: sbHeaders
      })
      const clients = await clientRes.json()

      if(!clients || !clients.length) {
        return res.status(200).json({ ok: true, ignored: 'no client matched channel' })
      }

      const client = clients[0]
      const today = new Date().toISOString().slice(0, 10)

      // Update last contact in Supabase
      await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${client.id}`, {
        method: 'PATCH',
        headers: sbHeaders,
        body: JSON.stringify({ last_contact: today, updated_at: new Date().toISOString() })
      })

      console.log(`Auto-logged contact for ${client.name} from channel ${channelId}`)
      return res.status(200).json({ ok: true, logged: client.name })

    } catch(e) {
      console.error('Slack event error:', e)
      return res.status(200).json({ ok: true, error: e.message })
    }
  }

  return res.status(200).json({ ok: true })
}
