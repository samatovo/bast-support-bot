
export interface SlackChannel {
  id: string
  name: string
}

export interface SlackReaction {
  name: string
  users: string[]
  count: number
}

export interface SlackMessage {
  type: string
  text: string
  bot_id?: string
  subtype?: string
  ts: string
  user: string
  reactions?: SlackReaction[]
}

export interface ErrorResponse {
  "ok": false
  "error": string
} 

export interface GoodResponse {
  "ok": true
}

export type SlackResponse = ErrorResponse | GoodResponse

export interface UsersConversationsResponse extends GoodResponse {
  channels: SlackChannel[]
}
export interface ConversationsHistoryResponse extends GoodResponse {
  messages: SlackMessage[]
}

export interface MessageCbEvent {
  type: 'message'
  text: string
  bot_id?: string
  channel_type: string
  channel: string
  ts: string
  user: string
}


export type CbEvent = MessageCbEvent

export interface UrlVerification {
  type: 'url_verification'
  challenge: string
  token: string
}

export interface RegularCallbackEvent {
  type: 'event_callback'
  token: string
  event: CbEvent
  
}

export type CallbackEvent = UrlVerification | RegularCallbackEvent