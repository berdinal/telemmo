import {
  curry,
  pipe,
  merge,
  head,
} from 'ramda'

import { ObjectId } from 'mongodb'

import { level, nextLevelBar } from '../core/level'
import membersExp from '../core/membersExp'

import { unspentStatPoints } from './statHelpers'

import {
  showBonus,
  equippedIds,
  equipDetails,
  mergeEquipBonuses,
} from './equipHelpers'

import { rejectUndefined } from './errors'
import { capitalize } from './helpers'

export default function call (dao, provider, _, msg) {
  return dao.character
    .find({
//      _id: new ObjectId(msg.player.currentCharId),
      _id: msg.player.currentCharId,
    })
    .then(head)
    .then(rejectUndefined(msg, _('Invalid char Id')))
    .then(char => membersExp(dao, [char.id])
      .then(head)
      .then(expObj => merge(char, {
        exp: expObj ? expObj.exp : 0,
      }))
      .then(charWithoutLevel => merge(charWithoutLevel, {
        level: level(charWithoutLevel),
      })),
    )
    .then(char => ({
      char,
      equipBonuses: curry(showBonus)(
        pipe(equippedIds, equipDetails, mergeEquipBonuses)(char),
      ),
    }))
    .then(({ char, equipBonuses }) => ({
      to: msg.chat,
      text: [
        _('<b>Titles:</b> %s', msg.player.titles.join(', ')),
        _('<b>Name:</b> %s', char.name),
        _('<b>Class:</b> %s', capitalize(char.classId)),
        _('<b>Stance:</b> %s', capitalize(char.stance)),
        _('<b>Level:</b> %s', char.level),
        _('<b>Exp:</b> %s', char.exp),
        _('<b>Level Progress :</b>\n<pre>%s</pre>', nextLevelBar(char)),
        '',
        _('Base stats and equipment bonuses:'),
        _('<b>Strength: </b> %s %s', char.str, equipBonuses('str')),
        _('<b>Constitution: </b> %s %s', char.con, equipBonuses('con')),
        _('<b>Reflex: </b> %s %s', char.ref, equipBonuses('ref')),
        _('<b>Accuracy: </b> %s %s', char.acc, equipBonuses('acc')),
        _('<b>Flow: </b> %s %s', char.flow, equipBonuses('flow')),
        _('<b>StatPoints: </b> %s', unspentStatPoints(char)),
        '',
        _('Get stronger with /improve_stats.'),
        _('Equip yourself in /inventory.'),
      ].join('\n'),
    }))
}

