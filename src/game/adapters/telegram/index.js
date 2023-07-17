import {
  partial,
  merge,
  mergeWith,
  head,
  objOf,
} from 'ramda'

import emoji from 'node-emoji'
import routes from './routes'
import tasks from '../../tasks'
import i18n from '../../i18n'
import TelegramBot from 'node-telegram-bot-api'

function handleError (provider, error) {
  console.log('Provider in error handler:', provider)  // New log here

  if (error.msg) {
    return provider.send(error.msg.chat, error.text)
  }

  console.error('An error returned something not sendable')
  console.error(error)
}

function normalizeMessage (dao, provider, route, msg) {
  const normal = {
    text: msg.text,
    matches: msg.text.match(route.match),
    provider: 'telegram',
    nick: msg.from.username,
    chat: msg.chat.id,
    user: msg.from.id,
    player: {
      language: 'en',
    },
  }

  return dao.player
    .find({ 'providers.telegram.id': normal.user })
    .then(head)
    .then(objOf('player'))
    .then(mergeWith(merge, normal))
}

function dispatch (provider, reply) {
  console.log(reply)

  const { to, text, options } = reply
  let telegramOptions = {
    parse_mode: 'HTML',
  }

  if (options) {
    let keyboard = options.map(row => row.map(emoji.emojify));
//    console.log("Processed Keyboard:", keyboard); // New log here

    telegramOptions.reply_markup = {   // Modify this line
      keyboard: keyboard,
      one_time_keyboard: true   // Assuming you want the keyboard to be one-time
    };

    console.log("Processed Keyboard:", JSON.stringify(keyboard, null, 2)); // New log here
    console.log('Telegram options:', JSON.stringify(telegramOptions, null, 2)); // New log here
  }

//  console.log('Telegram options:', telegramOptions)  // New log here


  const sendResult = provider.send(to, text, telegramOptions)
  console.log('Result of sending:', sendResult)  // New log here

  return sendResult
}

function handle (dao, provider, route, msg) {
  const translate = i18n.singular(msg.player.language)
  const disp = partial(dispatch, [provider])

  if (route.condition && !route.condition(msg)) {
    return route.error(dao, disp, translate, msg)
      .then(disp)
      .then(() => console.log(`${msg.chat} OK  "${msg.text}"`))
      .catch(partial(handleError, [provider]))
      .catch(partial(console.error, [`${msg.chat} ERR "${msg.text}":`]))
  }

  return route.handler(dao, disp, translate, msg)
    .then(disp)
    .then(() => console.log(`${msg.chat} OK  "${msg.text}"`))
    .then(() => {
      if (typeof route.next === 'function') {
        return route.next(dao, disp, translate, msg)
          .then(disp)
      }
    })
    .catch(partial(handleError, [provider]))
    .catch(partial(console.error, [`${msg.chat} ERR "${msg.text}":`]))
}


export default function start (dao, provider) {
  return Promise.all([
    ...tasks.map(task =>
      task(dao, partial(dispatch, [provider]))),
    ...routes.map(route => provider
      .subscribe(route.match)
      .flatMap(partial(normalizeMessage, [dao, provider, route]))
      .subscribe(
        partial(handle, [dao, provider, route]),
        (err) => console.error('Unhandled error:', err),
      ),
    ),
  ])
}

