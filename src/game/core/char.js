import {
  map,
  prop,
  pipe,
  always,
  length,
  partial,
  ifElse,
  equals,
} from 'ramda'

export function useChar (dao, playerId, char) {
  return dao.character.find({ playerId })
    .then(chars => dao.combat.find({
      'teams.members.id': { $in: map(prop('id'), chars) },
      finishedAt: { $exists: false },
    }))
    .then(partial(dao.player.update, [
      { _id: playerId },
      {  currentCharId: char.id },
    ]))
    .then(always(char))
}
