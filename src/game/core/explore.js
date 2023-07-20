import {
  prop,
  pipe,
  identity,
  contains,
  partial,
  merge,
  objOf,
  ifElse,
  isNil,
  tap,
} from 'ramda'

import { Observable } from 'rx'

import models from '../models'
import { run } from './combat'
import pickRandom from './pickRandom'
import weightedPool from './weightedPool'

export function randomMonster (mapId) {
  const mapObj = models.maps.find(mapId)
  const monsterId = pickRandom(weightedPool(mapObj.monsters))
  return models.monsters.find(monsterId)
}

const playerExplorations = pipe(
  prop('id'),
  objOf('teams.members.playerId'),
  merge({ finishedAt: { $exists: false } }),
)



export function exploreUntilDead(dao, player, gameMap, char) {
  return Observable.create((subscriber) => {
    function fight() {
      console.log('Entering function exploreUntilDead in explore.js');
      const monster = randomMonster(gameMap.id)
      const source = { name: 'map', id: gameMap.id }

      console.log('monster:', monster);
      console.log('source:', source);

      console.log('run is function:', typeof run === 'function'); // <- Log whether run is a function
      console.log('run:', run); // <- Log the actual run
      //log the actual run function as readable string
      console.log('run.toString():', run.toString());

      console.log('dao.combat.destroy is function:', typeof dao.combat.destroy === 'function'); // <- Log whether dao.combat.destroy is a function

      const playerExploration = playerExplorations(player);
      console.log('playerExplorations(player):', playerExploration); // <- Log playerExplorations(player)

      return dao.combat.destroy(playerExploration, { hard: true })
        .then(result => {
          console.log('dao.combat.destroy result:', result);
          return result;
        })
        .catch(error => {
          console.error('dao.combat.destroy error:', error);
          throw error; // Make sure to re-throw the error so that the promise remains rejected
        })
        .then(() => {
          console.log('Checking arguments:', dao, source, monster, char);
//          return Promise.resolve();
          return run(dao, source, [[monster], [char]]);
        })
        .then(result => {
          console.log('run result:', result);
          return result;
        })
        .catch(error => {
          console.error('run error:', error);
          throw error; // Make sure to re-throw the error so that the promise remains rejected
        })
        .then(ifElse(
          isNil,
          () => {
            console.log('Promise rejected due to ifElse resulting in isNil');
            return Promise.reject(new Error())
          },
          identity,
        ))
        .then(tap(subscriber.next.bind(subscriber)))
        .then(ifElse(
          pipe(prop('winners'), contains(player.currentCharId)),
          fight,
          identity,
        ))
        .catch(error => {
          console.error('General catch error:', error);
          throw error; // Make sure to re-throw the error so that the promise remains rejected
        });
    }

    fight()
  })
}




// export function exploreUntilDead (dao, player, gameMap, char) {
//   return Observable.create((subscriber) => {
//     function fight () {
//       const monster = randomMonster(gameMap.id)
//       const source = { name: 'map', id: gameMap.id }

//       console.log('run is function:', typeof run === 'function'); // <- Log whether run is a function
//       console.log('run:', run); // <- Log the actual run
//       console.log('dao.combat.destroy is function:', typeof dao.combat.destroy === 'function'); // <- Log whether dao.combat.destroy is a function
//       console.log('playerExplorations(player):', playerExplorations(player)); // <- Log playerExplorations(player)
//       return dao.combat.destroy(playerExplorations(player), { hard: true })
//         .then(partial(run, [dao, source, [[monster], [char]]]))
//         .then(ifElse(
//           isNil,
//           () => Promise.reject(new Error()),
//           identity,
//         ))
//         .then(tap(subscriber.next.bind(subscriber)))
//         .then(ifElse(
//           pipe(prop('winners'), contains(player.currentCharId)),
//           fight,
//           identity,
//         ))
//         .catch(partial(console.log, ['Invalid combat token']))
//     }

//     fight()
//   })
// }
