import { ObjectId } from 'mongodb'
import {
  assocPath,
  flatten,
  partial,
  filter,
  pipe,
  head,
  prop,
  uniq,
  map,
  __,
} from 'ramda'


import Promise from 'bluebird'
import cluster from 'cluster'

import { start } from '../core/combat'
import { exploreUntilDead } from '../core/explore'
import { render } from '../handlers/explore'
import models from '../models'
import _ from '../i18n'

const members = pipe(
  prop('teams'),
  flatten,
  map(prop('members')),
  flatten,
  map(prop('id')),
  filter(ObjectId.isValid),
  uniq,
  assocPath(['_id', '$in'], __, {}),
)

function renderCombat (player, combat) {
  return {
    to: player.providers.telegram.id,
    text: render(_.singular(player.language), player, combat),
  }
}

// function continueExploration (dao, dispatch, combats) {
//   const explorations = combats.map(
//     Promise.coroutine(function* (combat) {
//       console.info(combat)
//       const gameMap = models.maps.find(combat.source.id)
//       const char = yield dao.character.find(members(combat)).then(head)
//       const player = yield dao.player.find(char.playerId).then(head)

//       exploreUntilDead(dao, player, gameMap, char)
//         .map(partial(renderCombat, [player]))
//         .subscribe(dispatch)

//       return dispatch(renderCombat(player, combat))
//     }),
//   )

//   return Promise.all(explorations)
// }


function continueExploration (dao, dispatch, combats) {
  console.info('Starting exploration with combat data:', combats); // initial debug log
  const explorations = combats.map(
    Promise.coroutine(function* (combat) {
      console.info('Starting a combat sequence with data:', combat); // debug log for each combat
      const gameMap = models.maps.find(combat.source.id);
      console.info('Found map for current combat:', gameMap); // debug log for found map

      const char = yield dao.character.find(members(combat)).then(head);
      console.info('Character for the current combat:', char); // debug log for found character

      const player = yield dao.player.find(char.playerId).then(head);
      console.info('Player for the current combat:', player); // debug log for found player

      exploreUntilDead(dao, player, gameMap, char)
        .map(partial(renderCombat, [player]))
        .subscribe(dispatch);

      console.info('Combat sequence completed'); // debug log for completed combat
      return dispatch(renderCombat(player, combat));
    }),
  );

  return Promise.all(explorations)
    .then((results) => {
      console.info('All explorations completed', results); // debug log for all completed explorations
      return results;
    });
}





function startCombat (combat) {
  console.info('Resuming combat', combat.id)
  return start(combat)
}

// export default function resumeCombats (dao, dispatch) {
//   if (cluster.isMaster) {
//     console.log('Resuming combats...')
//     return dao.combat.find({ finishedAt: { $exists: false } })
//       .then(combats => Promise.all(combats.map(startCombat)))
//       .then(combats => Promise.all(combats.map(combat =>
//           dao.combat.update({ _id: combat.id }, combat))))
//       .then(combats => continueExploration(dao, dispatch, combats))
//   }

//   return Promise.resolve()
// }

// export default function resumeCombats (dao, dispatch) {
//   if (cluster.isMaster) {
//     console.log('Resuming combats...')
//     return dao.combat.find({ finishedAt: { $exists: false } })
//       .then(combats => Promise.all(combats.map(startCombat)))
//       .then(combats => Promise.all(combats.map(combat =>
//           dao.combat.update(
//             { _id: combat.id }, 
//             { combat } // This will set each field in the document to its corresponding value in `combat`
//           )
//         ))
//       )
//       .then(combats => continueExploration(dao, dispatch, combats))
//   }

//   return Promise.resolve()
// }


export default function resumeCombats(dao, dispatch) {
  if (cluster.isMaster) {
    console.info('Resuming combats...');
    return dao.combat.find({ finishedAt: { $exists: false } })
      .then(combats => {
        console.info('Found combats:', combats);
        return Promise.all(combats.map(startCombat));
      })
      .then(combats => {
        console.info('Started combats:', combats);
        return Promise.all(combats.map(combat =>
          dao.combat.update(
            { _id: combat.id },
            { combat } // This will set each field in the document to its corresponding value in `combat`
          )
          .then(updatedCombat => {
            console.info('Updated combat:', updatedCombat);
            return updatedCombat;
          })
        ));
      })
      .then(combats => {
        console.info('Updated combats:', combats);
        return continueExploration(dao, dispatch, combats);
      })
      .catch(err => {
        console.error('An error occurred while resuming combats:', err);
      });
  }

  console.log('Not in master cluster, skipping resuming combats.');
  return Promise.resolve();
}
