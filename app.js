/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger Platform Quick Start Tutorial
 *
 * This is the completed code for the Messenger Platform quick start tutorial
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 * To run this code, you must do the following:
 *
 * 1. Deploy this code to a server running Node.js
 * 2. Run `yarn install`
 * 3. Add your VERIFY_TOKEN and PAGE_ACCESS_TOKEN to your environment vars
 */

'use strict'

// Use dotenv to read .env vars into Node
require('dotenv').config()

const { MongoClient, ServerApiVersion } = require('mongodb')

const path = require('path')
const fs = require('fs')
const chatGPTResponse = require('./chatGPT')

// Imports dependencies and set up http server
const request = require('request'),
  express = require('express'),
  { urlencoded, json } = require('body-parser'),
  app = express()

// Parse application/x-www-form-urlencoded
app.use(urlencoded({ extended: true }))

// Parse application/json
app.use(json())

// Respond with 'Hello World' when a GET request is made to the homepage
app.get('/', function (_req, res) {
  res.send('Hello World')
})

// Read the privacy policy HTML file
const privacyPolicyPath = path.join(__dirname, 'privacy-policy.html')
const privacyPolicy = fs.readFileSync(privacyPolicyPath, 'utf8')

app.get('/privacy-policy', function (_req, res) {
  res.send(privacyPolicy)
})

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
  // Your verify token. Should be a random string.
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN

  // Parse the query params
  let mode = req.query['hub.mode']
  let token = req.query['hub.verify_token']
  let challenge = req.query['hub.challenge']

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED')
      res.status(200).send(challenge)
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403)
    }
  }
})

// Creates the endpoint for your webhook
app.post('/webhook', (req, res) => {
  let body = req.body

  // Checks if this is an event from a page subscription
  if (body.object === 'page') {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {
      if (entry.messaging) {
        // Gets the body of the webhook event
        let webhookEvent = entry.messaging[0]
        console.log(webhookEvent)

        // Get the sender PSID
        let senderPsid = webhookEvent.sender.id
        console.log('Sender PSID: ' + senderPsid)

        // Check if the event is a message or postback and
        // pass the event to the appropriate handler function
        if (webhookEvent.message) {
          handleMessage(senderPsid, webhookEvent.message)
        } else if (webhookEvent.postback) {
          handlePostback(senderPsid, webhookEvent.postback)
        } else if (webhookEvent.referral) {
          handleIncoming(sender_psid, webhookEvent.referral)
        }
      } else if (entry.changes) {
        processComments(entry.changes[0].value)
      }
    })

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED')
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404)
  }
})

// Handles sender actions
async function sendTypingStatus(senderPsid, receivedSenderAction) {
  // Send the response message
  callSendAPI(senderPsid, undefined, receivedSenderAction)
}

// Handles messages events
async function handleMessage(senderPsid, receivedMessage) {
  let response
  await sendTypingStatus(senderPsid, 'TYPING_ON')

  // Checks if the message contains text
  if (receivedMessage.text) {
    // Create the payload for a basic text message, which
    // will be added to the body of your request to the Send API
    const gptRes = await chatGPTResponse(
      receivedMessage.text,
      senderPsid,
      client
    )
    response = {
      text: `${gptRes}`
    }
  } else if (receivedMessage.attachments) {
    // Get the URL of the message attachment
    let attachmentUrl = receivedMessage.attachments[0].payload.url
    // response = {
    //   attachment: {
    //     type: 'template',
    //     payload: {
    //       template_type: 'generic',
    //       elements: [
    //         {
    //           title: 'Is this the right picture?',
    //           subtitle: 'Tap a button to answer.',
    //           image_url: attachmentUrl,
    //           buttons: [
    //             {
    //               type: 'postback',
    //               title: 'Yes!',
    //               payload: 'yes'
    //             },
    //             {
    //               type: 'postback',
    //               title: 'No!',
    //               payload: 'no'
    //             }
    //           ]
    //         }
    //       ]
    //     }
    //   }
    // }

    response = {
      text: `Sorry, I can only process text messages for now.`
    }
  }

  // Send the response message
  callSendAPI(senderPsid, response)

  await sendTypingStatus(senderPsid, 'TYPING_OFF')
}

// Handles messaging_postbacks events
function handlePostback(senderPsid, receivedPostback) {
  let response

  // Get the payload for the postback
  let payload = receivedPostback.payload

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { text: 'Thanks!' }
  } else if (payload === 'no') {
    response = { text: 'Oops, try sending another image.' }
  }
  // Send the message to acknowledge the postback
  callSendAPI(senderPsid, response)
}

// Handle incoming messages from marketing bot
function handleIncoming(sender_psid, received_postback) {
  let response
  if (received_postback.ref) {
    response = {
      text: `Nice to see you again. I have your original message, "${received_postback.ref}". \n Let me see how I can help.`
    }
  } else {
    let payload = received_postback.payload
    if (payload === 'get_started') {
      response = {
        text: `Welcome. I have your original message, "${received_postback.referral.ref}". \n Let me see how I can help.`
      }
    }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response)
}

// Sends response messages via the Send API
function callSendAPI(senderPsid, response, sender_action) {
  // The page access token we have generated in your app settings
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN

  // Construct the message body
  let requestBody = {
    recipient: {
      id: senderPsid
    },
    message: response,
    sender_action
  }

  // Send the HTTP request to the Messenger Platform
  request(
    {
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: requestBody
    },
    (err, _res, _body) => {
      if (!err) {
        console.log('Message sent!')
      } else {
        console.error('Unable to send message:' + err)
      }
    }
  )
}

// Processes incoming posts to page to get ID of the poster
function processComments(comment) {
  let comment_id
  if (comment.item == 'post') {
    comment_id = comment.post_id
  } else if (comment.item == 'comment') {
    comment_id = comment.comment_id
  }
  console.log('id: ' + comment_id)
  let encode_message = encodeURIComponent(comment.message)
  let message_body = `Thank you for your question, to better assist you I am passing you to our support department. Click the link below to be transferred. https://m.me/acmeincsupport?ref=${encode_message}`
  let request_body = {
    message: message_body
  }
  request(
    {
      uri: `https://graph.facebook.com/v2.12/${comment_id}/private_replies`,
      qs: { access_token: access_token },
      method: 'POST',
      json: request_body
    },
    (err, res) => {
      if (!err) {
        console.log('Private reply sent')
      }
    }
  )
}

const uri = process.env.ATLAS_URI
const client = new MongoClient(uri)

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)

  async function run() {
    console.log('Connecting to database...')

    await client.connect()
    console.log('Connected successfully to database')

    // Make sure to call close() on your client to perform cleanup operations
    // await client.close()
  }
  run().catch(console.dir)
})
