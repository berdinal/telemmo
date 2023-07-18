import {
  find,
  partial,
  propEq,
  propOr,
  pipe,
  merge,
} from 'ramda'

import { level } from '../level'
import { teamsMemberIds } from './utils'

function mergeLevel (teams, computedExps) {
  console.log("Teams: ", teams); // Add debug line
  return teams.map(team => {
    console.log("Team: ", team); // Add debug line
    return team.map((char) => {
      if (char.prizes) { return char }
      const charExp = pipe(find(propEq('_id', char.id)), propOr(0, 'exp'))
      const exp = charExp(computedExps)
      return merge(char, { exp, level: level({ exp }) })
    })
  });
}

export default function (dao, teams) {
  console.log("Entering addTeamsLevels with:", {dao, teams})
  const members = teamsMemberIds(teams)

  return dao.combat.aggregate([
    { $match: { winners: { $in: members } } },
    { $project: { prizes: 1 } },
    { $unwind: '$prizes' },
    { $project: { exp: '$prizes.exp', charId: '$prizes.charId' } },
    { $group: { _id: '$charId', exp: { $sum: '$exp' } } },
  ])
    .then(partial(mergeLevel, [teams]))
}
