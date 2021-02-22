import * as functions from "firebase-functions";
import { processEvent } from "./slack";
import { CallbackEvent } from "./types";

export const myBot = functions.https.onRequest( (req, res) => {
  // Request from Slack
  const body: CallbackEvent = req.body

  if (body.type === 'url_verification') {
    res.send(body.challenge)
  } else if (body.type === 'event_callback') {
    res.send('')
    processEvent(body.event)
  } else {
    res.send('')
  }
});
