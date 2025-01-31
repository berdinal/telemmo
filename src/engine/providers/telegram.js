//Removed webhook code from src\engine\providers\telegram.js

require('dotenv').config();

import cluster from 'cluster'

import emoji from 'node-emoji'
import TelegramBot from 'node-telegram-bot-api'
import { Observable } from 'rx'

import {
  always,
  partial,
} from 'ramda'

function buildFilter (stream, regex) {
  const match = new RegExp(regex)
  return stream.filter(msg => match.test(msg.text))
}

function sendMessage (bot, chat, message, options) {
  if (process.env.TELEMMO_QUIET !== "false") {
    return
  }
  bot.sendMessage(chat, emoji.emojify(message), options)
}

function start () {
  const {
    BOT_KEY: token,
    HTTP_WORKERS: numWorkers,
  } = process.env

  let options = {
    polling: true,
  }

  if (numWorkers && cluster.isMaster) {
    console.log(`Master ${process.pid} is running`)

    Array.from({ length: numWorkers }).forEach(() => {
      cluster.fork()
    })

    cluster.on('exit', (worker) => {
      console.log(`Worker ${worker.process.pid} died`)
    })
    
    // Return a resolved Promise in the master process
  //  return Promise.resolve()
  }

  const bot = new TelegramBot(token, options)

  bot.on('polling_error', (error) => {
    console.log(`Error Code: ${error.code}. Error Message: ${error.message}`);
  });

  const stream = Observable.fromEvent(bot, 'message')

  if (process.env.NODE_ENV !== 'production') {
    stream.subscribe(console.log)
  }

  console.log(`Worker ${process.pid} started`)

  return bot.getMe()
    .then(always({
      send: partial(sendMessage, [bot]), // => Stream
      subscribe: partial(buildFilter, [stream]), // => Stream
    }))
}

export default {
  start,
}

