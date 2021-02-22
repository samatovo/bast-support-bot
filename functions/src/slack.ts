
import * as functions from "firebase-functions";
import fetch from 'node-fetch'
import { CbEvent, SlackResponse, GoodResponse, UsersConversationsResponse, ConversationsHistoryResponse, SlackMessage, MessageCbEvent } from './types'


async function slackPost(apiMethod: string, body: string) {
  const token = functions.config().slack.token
  const res = await fetch(`https://slack.com/api/${apiMethod}`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`
    },
    body
  })
  if (!res.ok) {
    console.log('res:', await res.json())
  }
}

async function slackGet<T extends GoodResponse>(apiMethod: string): Promise<T> {
  const token = functions.config().slack.token
  const url = `https://slack.com/api/${apiMethod}`
  console.log('url:', url)
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) {
    const error = await res.text()
    console.log('error:', error)
    throw new Error(error)
  } else {
    const response: SlackResponse = await res.json()
    if (response.ok === false) {
      throw new Error('Error response:'+response.error)
    } else if (response.ok === true) {
      return response as T
    } else {
      throw new Error('Unknown response:'+response)
    }
  }
}

async function send(channel: string, text: string) {
  await slackPost('chat.postMessage', JSON.stringify({
    channel,
    text
  }))
}

async function reply(channel: string, thread_ts: string, text: string) {
  await slackPost('chat.postMessage', JSON.stringify({
    channel,
    thread_ts,
    text
  }))
}
async function replyEph(channel: string, thread_ts: string, user: string, text: string) {
  await slackPost('chat.postEphemeral', JSON.stringify({
    channel,
    thread_ts,
    user,
    text
  }))
}

async function summaryCommand(event: MessageCbEvent) {
  await reply(event.channel, event.ts, "I'll just gather some statistics")
  const {channels} = await slackGet<UsersConversationsResponse>("users.conversations")
  const twoWeeksAgo = calcTwoWeeksAgo()
  for(const channel of channels) {
    const {messages} = await slackGet<ConversationsHistoryResponse>(`conversations.history?channel=${channel.id}&oldest=${twoWeeksAgo}`)
    const validMessages = messages.filter(m => m.type==="message" && !m.bot_id && !m.subtype)
    const {total, lookedAt, resolved} = validMessages.reduce((p, message) => {
      p.total++
      if (messageHas(message, "white_check_mark", "eyes")) p.lookedAt++
      if (messageHas(message, "white_check_mark")) p.resolved++
      return p
    }, {total: 0, lookedAt: 0, resolved: 0})
    await reply(event.channel, event.ts, `In channel <#${channel.id}> in the last 14 days there ${total === 1 ? 'was':'were'} ${total} messages, ${lookedAt} ${lookedAt === 1 ? 'was':'were'} looked into and ${resolved} ${resolved === 1 ? 'was':'were'} resolved.`)
  } 
}

function calcTwoWeeksAgo() {
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0)
  const twoWeeksAgo = (midnight.getTime() / 1000) - (7 * 24 * 60 * 60)
  return twoWeeksAgo
}

function messageHas (message: SlackMessage, ...emoji: string[]) {
  return Array.isArray(message.reactions) && message.reactions.some(x => emoji.includes(x.name))
}

async function statusCommand(event: MessageCbEvent) {
  const {channels} = await slackGet<UsersConversationsResponse>("users.conversations")
  const twoWeeksAgo = calcTwoWeeksAgo()
  for(const channel of channels) {
    const {messages} = await slackGet<ConversationsHistoryResponse>(`conversations.history?channel=${channel.id}&oldest=${twoWeeksAgo}`)
    const validMessages = messages.filter(m => m.type==="message" && !m.bot_id && !m.subtype)
      .sort((a: SlackMessage, b: SlackMessage) => a.ts.localeCompare(b.ts))
    const unseen = validMessages.filter(m => !messageHas(m, "white_check_mark", "eyes"))
    const unresolved = validMessages.filter(m => !unseen.includes(m) && !messageHas(m, "white_check_mark"))

    for(const msg of unseen) {
      await send(event.channel, 
        `:warning: <@${msg.user}>: "${msg.text.substr(0, 40)}..." is waiting for triage`)
    }

    for(const msg of unresolved) {
      await send(event.channel, 
        `:question: <@${msg.user}>: "${msg.text.substr(0, 40)}..." is waiting for resolution`)
    }
  } 
}

export async function processEvent(event: CbEvent) {
  if (event.type === 'message' && !event.bot_id) {
    if (event.channel_type === 'im') {
      if (event.text === 'summary') {
        await summaryCommand(event)
      } else if (event.text === 'status' || event.text === 's') {
        await statusCommand(event)
      }
    } else if (event.channel_type === 'channel') {
      await replyEph(event.channel, event.ts, event.user, "Thanks for asking the BAST team a question. Once someone adds the :eyes: emoji then they'll be looking into your message. Once this request has been resolve, we'll add the :white_check_mark:. Feel free to add it your self once you feel your request has been resolved.")
      await reply(event.channel, event.ts, "Hello world :tada:")
    }
  }
}