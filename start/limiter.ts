/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| The "limiter.define" method creates an HTTP middleware to apply rate
| limits on a route or a group of routes. Feel free to define as many
| throttle middleware as needed.
|
*/

import limiter from '@adonisjs/limiter/services/main'

export const globalThrottle = limiter.define('global', () => {
  return limiter.allowRequests(60).every('1 minute')
})

export const signupThrottle = limiter.define('signup', () => {
  return limiter.allowRequests(5).every('10 minutes')
})
