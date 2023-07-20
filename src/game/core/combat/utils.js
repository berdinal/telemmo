import {
  prop,
  flatten,
  filter,
  pipe,
  map,
} from 'ramda'

import { ObjectId } from 'mongodb'

// function createObjectId(id) {
//   return new ObjectId(id);
// }

// export const teamsMemberIds = pipe(
//   arr => {console.info('Flatten input:', arr); return arr;},
//   flatten,
//   arr => {console.info('After flatten:', arr); return arr;},
//   map(prop('id')),
//   arr => {console.info('After map ids:', arr); return arr;},
//   filter(ObjectId.isValid),
//   arr => {console.info('After filter valid ids:', arr); return arr;},
//   map(ObjectId),
//   arr => {console.info('After map to ObjectId:', arr); return arr;},
// )

// export const combatMemberIds = pipe(
//   obj => {console.info('Initial object:', obj); return obj;},
//   prop('teams'),
//   arr => {console.info('After prop teams:', arr); return arr;},
//   map(prop('members')),
//   arr => {console.info('After map members:', arr); return arr;},
//   teamsMemberIds,
// )


export const teamsMemberIds = pipe(
  flatten,
  map(prop('id')),
  filter(ObjectId.isValid),
//  map(createObjectId),
)

export const combatMemberIds = pipe(
  prop('teams'),
  map(prop('members')),
  teamsMemberIds,
)