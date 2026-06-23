const SLACK_TOKEN = process.env.SLACK_TOKEN
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || 'csa-hub'
const SUPABASE_URL = 'https://ozkfingocfzrfneijtxc.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY

async function postToSlack(text, blocks) {
  const body = { channel: SLACK_CHANNEL, text }
  if(blocks) body.blocks = blocks
  const r = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SLACK_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return r.json()
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if(req.method === 'OPTIONS') return res.status(200).end()
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, client, reason, digest } = req.body

  try {
    let result

    // ── AT RISK ALERT ──
    if(action === 'at_risk') {
      result = await postToSlack(
        `⚠️ ${client.name} flagged as At Risk`,
        [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*⚠️ At Risk Alert — ${client.name}*\n${reason||'Manually flagged as at risk'}` },
            fields: [
              { type: 'mrkdwn', text: `*ARR*\n${client.arr}` },
              { type: 'mrkdwn', text: `*Owner*\n${client.cso||client.owner||'—'}` },
              { type: 'mrkdwn', text: `*Status*\nAt Risk` },
              { type: 'mrkdwn', text: `*Last Contact*\n${client.lastContact||'Never'}` }
            ]
          },
          { type: 'divider' }
        ]
      )
    }

    // ── STRIKE ALERT ──
    else if(action === 'strike') {
      const pips = '⚡'.repeat(client.strikes||1)
      result = await postToSlack(
        `${pips} Strike ${client.strikes} added to ${client.name}`,
        [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*${pips} Strike ${client.strikes} — ${client.name}*\n_${reason||'No reason given'}_` },
            fields: [
              { type: 'mrkdwn', text: `*ARR*\n${client.arr}` },
              { type: 'mrkdwn', text: `*Owner*\n${client.cso||client.owner||'—'}` }
            ]
          }
        ]
      )
    }

    // ── CHURN PREDICTION ──
    else if(action === 'churn_prediction') {
      result = await postToSlack(
        `🔴 Churn prediction: ${client.name}`,
        [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*🔴 Churn Prediction — ${client.name}*\n${reason||'Flagged as potential churn'}` },
            fields: [
              { type: 'mrkdwn', text: `*ARR at risk*\n${client.arr}` },
              { type: 'mrkdwn', text: `*Owner*\n${client.cso||client.owner||'—'}` }
            ]
          }
        ]
      )
    }

    // ── WEEKLY DIGEST ──
    else if(action === 'digest') {
      result = await postToSlack(
        '📋 Weekly Solutions Digest',
        [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*📋 Weekly Solutions Digest*\n\`\`\`${digest}\`\`\`` }
          }
        ]
      )
    }

    // ── STUCK TICKET ALERT ──
    else if(action === 'stuck') {
      result = await postToSlack(
        `🚨 Stuck ticket: ${client.ticketKey}`,
        [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*🚨 Stuck Ticket — ${client.ticketKey}*\n${client.summary}\n_No update in ${client.days} days_` },
            fields: [
              { type: 'mrkdwn', text: `*Client*\n${client.name||'Unknown'}` },
              { type: 'mrkdwn', text: `*ARR*\n${client.arr||'—'}` }
            ]
          },
          {
            type: 'actions',
            elements: [{ type: 'button', text: { type: 'plain_text', text: 'View in Jira' }, url: `https://bitwave-dev.atlassian.net/browse/${client.ticketKey}` }]
          }
        ]
      )
    }

    // ── LOG CONTACT (from Slack message detection) ──
    else if(action === 'log_contact') {
      // Update last_contact in Supabase
      if(SUPABASE_KEY && client.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${client.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ last_contact: new Date().toISOString().slice(0,10), updated_at: new Date().toISOString() })
        })
      }
      result = { ok: true, action: 'contact_logged' }
    }

    return res.status(200).json({ ok: true, result })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
