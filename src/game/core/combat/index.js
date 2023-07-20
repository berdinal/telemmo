import {
  add,
  always,
  prop,
  assoc,
  mergeWith,
  ifElse,
  partial,
  isArrayLike,
  pipe,
  set,
  map,
  merge,
  lensProp,
} from 'ramda'

import cuid from 'cuid'
import Promise from 'bluebird'

import { buildCombatStats } from '../combatStats'

import dropPrizes from './dropPrizes'
import turn from './turn'
import addTeamsLevels from './addTeamsLevels'
import initiative from './initiative'
import { combatMemberIds } from './utils'

const { ObjectId } = require('mongodb');

function markFinished (combat) {
  return pipe(
    set(lensProp('finishedAt'), new Date()),
    set(lensProp('winners'), combat.teams[0].members.map(prop('id'))),
  )(combat)
}

function finish (combat) {
  return dropPrizes(combat)
    .then(markFinished)
}

function wait (combat) {
  const amount = process.env.NODE_ENV === 'production'
    ? 40000 + (Math.random() * 30000)
    : 3141 + (Math.random() * 2000)

  return Promise.delay(amount)
    .then(always(combat))
}

function updateCombat (dao, combat) {
  const query = {
    token: combat.token,
  }
  console.log("In updateCombat, dao is:", JSON.stringify(combat));
  console.log("In updateCombat, query is:", query);
  console.log("In updateCombat, combat object is:", combat);
  //log it in readable string
  console.log("In updateCombat, combat object is (stringify):", JSON.stringify(combat));

  return dao.combat.update(query, combat)
    .then(result => {
      console.log("In updateCombat, update result:", result);
      return result;
    })
    .catch(error => {
      console.error("Error in updateCombat:", error);
      return undefined; 
    });
}

// function upsertCombat (dao, combat) {
//   let query = {
//     'teams.members': {
//       $elemMatch: {
//         id: { $in: combatMemberIds(combat) },
//       },
//     },
//   }

//   if (combat.id) {
//     query = merge(query, { _id: combat.id })
//   }

//   if (!combat.finishedAt) {
//     query = merge(query, {
//       finishedAt: { $exists: false },
//     })
//   }

//   return dao.combat.update(query, combat, { upsert: true })
// }

//{"teams.members": {$elemMatch: {"id": ObjectId("64b6f4ea6d83b4c73da4b1b1")}}}


//{"teams.members": {$elemMatch:{"id.$oid":{$in:["64b6f4ea6d83b4c73da4b1b1"]}}}}


function upsertCombat (dao, combat) {
  console.log("Entering upsertCombat with:", {dao, combat});
  let query = {
    'teams.members': {
        $elemMatch: {
        id: { $in: combatMemberIds(combat).map(id => new ObjectId(id)) },
//        id: { $in: combatMemberIds(combat) },

      },
  },
  }
  console.log("Initial query:", query);

  if (combat.id) {
//    query = merge(query, { _id: ObjectId(combat.id) });
    query = merge(query, { _id: combat.id });
    console.log("Updated query after checking combat.id:", query);
  }

  if (!combat.finishedAt) {
    query = merge(query, {
      finishedAt: { $exists: false },
    });
    console.log("Updated query after checking combat.finishedAt:", query);
  }
  //Log the query with readable string
  console.log("Query before update:", JSON.stringify(query, null, 2));
//  console.log("Final query before update:", query);
//  query = {"teams.members": {$elemMatch:{"name":"Vincenot Figo"}}}
  return dao.combat.update(query, combat, { upsert: true })
  .then(result => {
    console.log("Update result:", result);
    return result;
  })
  .catch(error => {
    console.error("An error occurred while updating combat", error);
  });
}



function mergeFighter (a, b) {
  return ifElse(
    isArrayLike,
    always(undefined),
    add(b),
  )(a)
}

function buildTeam (members) {
  return {
    overall: members.reduce((acc, fighter) =>
      mergeWith(mergeFighter, acc, fighter),
      { stance: [] }),
    members,
  }
}

// function build (dao, source, tms) {
//   return Promise.resolve(tms)
//     .then(partial(addTeamsLevels, [dao]))
//     .then(teams =>
//       Promise.all(teams.map(team =>
//         Promise.all(team.map(buildCombatStats)))),
//     )
//     .then(map(buildTeam))
//     .then(initiative)
//     .then(initTurn => ({
//       teams: initTurn.order,
//       initialTeams: initTurn.order,
//       startedAt: new Date(),
//       turns: [
//         {
//           winner: initTurn.order[0].overall.name,
//           rolls: initTurn.rolls,
//         },
//       ],
//     }))
//     .then(assoc('token', cuid()))
//     .then(assoc('source', source))
//     .then(partial(upsertCombat, [dao]))
//     .then(wait)
// }


function build (dao, source, tms) {
  console.log("Entering build with:", {dao, source, tms});
  return Promise.resolve(tms)
    .then(partial(addTeamsLevels, [dao]))
    .then(teams => {
      console.log("After addTeamsLevels, teams:", teams);
      console.log("team type:", typeof team);
      console.log("buildCombatStats type:", typeof buildCombatStats);
      return Promise.all(teams.map(team =>
        Promise.all(team.map(buildCombatStats))));
    })
    .then(teams => {
      console.log("After building combat stats, teams:", teams);
      return map(buildTeam)(teams);
    })
    .then(initiative)
    .then(initTurn => {
      console.log("After initiative, initTurn:", initTurn);
      return {
        teams: initTurn.order,
        initialTeams: initTurn.order,
        startedAt: new Date(),
        turns: [
          {
            winner: initTurn.order[0].overall.name,
            rolls: initTurn.rolls,
          },
        ],
      };
    })
    .then(comb => {
      console.log("After building initial combat object, comb:", comb);
      return assoc('token', cuid())(comb);
    })
    .then(comb => {
      console.log("After associating token, comb:", comb);
      return assoc('source', source)(comb);
    })
    .then(partial(upsertCombat, [dao]))
    .then(wait)
    .then(result => {
      console.log("After wait, result:", result);
      return result;
    })
    .catch(error => {
      console.error("Error in build function:", error);
      return undefined; 
    });
}


export function start (combat) {
  function* generate () {
    let state = combat
    console.log("Entering generate with initial state:", state);
    while (!state.finishedAt) {
      state = yield turn(state, finish)
      console.log("In generate loop, state after yield:", state);
    }
    console.log("Exiting generate with final state:", state);
    return state
  }

  return Promise.resolve()
    .then(Promise.coroutine(generate))
}


// export function start (combat) {
//   function* generate () {
//     let state = combat
//     console.log("Entering generate with initial state:", state);

//     while (!state.finishedAt) {
//       state = yield turn(state, finish);
//       console.log("In generate loop, state after yield:", state);
//     }

//     console.log("Exiting generate with final state:", state);
//     return state
//   }

//   return Promise.resolve()
//     .then(() => {
//       console.log("Starting coroutine...");
//       return Promise.coroutine(generate);
//     })
//     .then(result => {
//       console.log("After coroutine, result:", result);
//       return result;
//     })
//     .catch(error => {
//       console.error("Error in start function:", error);
//       return undefined; 
//     });
// }


export function run (dao, source, teams) {
  return build(dao, source, teams)
    .then(start)
    .then(partial(updateCombat, [dao]))
    .catch((error) => {
      //Make the error more prominent in the console
      console.error('!!!!!!!!!!!! Error in run function !!!!!!!!!!!!', error);
      console.error('Error in run function:', error);
      // You can return a default value or rethrow the error after logging
      //return undefined; 
      // rethrrow error
      throw error;
    });
}


