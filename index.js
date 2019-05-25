/*
 * index.js
 * Created: Sat May 25 2019 21:45:59 GMT+0530 (IST)
 * Copyright 2019 Harish.K<harish2704@gmail.com>
 */
const Koa = require('koa');
const Router = require('koa-joi-router');
const util = require('util');
const {RateLimiterMemory} = require('rate-limiter-flexible');


const app = new Koa();
const router = new Router();
const Joi = Router.Joi;
const _exec = util.promisify( require('child_process').exec );
const ethDev = process.env.ETH_DEV
const rateLimitOpts = {
  points: 5, // 1 request for ctx.ip
  duration: 5, // per 1 second
};
const rateLimiter = new RateLimiterMemory( rateLimitOpts );
const MyJoi = {
  ipv6: function(){
    return Joi.string().ip({
      version: [
        'ipv6'
      ],
      cidr: 'forbidden'
    })
  },
  ipv6Array: function(){
    return Joi.array().items( MyJoi.ipv6() );
  }
};


async function exec( cmd ){
  const result = await _exec( cmd );
  if( result.stderr.length ){
    throw new Error( result.stderr );
  }
  return result.stdout;
}


function setRateLimitHeader( ctx, rateLimitInfo ){
  ctx.response.set({
    "X-RateLimit-Limit": rateLimitOpts.points,
    "X-RateLimit-Remaining": rateLimitInfo.remainingPoints,
    "X-RateLimit-Reset": new Date(Date.now() + rateLimitInfo.msBeforeNext).toUTCString()
  });
}


async function rateLimiterMiddleWare( ctx, next ){
  try {
    let rlInfo = await rateLimiter.consume(ctx.ip)
    setRateLimitHeader( ctx, rlInfo );
    await next().catch();
  } catch ( rlInfo ) {
    ctx.status = 429
    ctx.response.set({
      "Retry-After": rlInfo.msBeforeNext / 1000,
    });
    setRateLimitHeader( ctx, rlInfo );
    ctx.body = { error: 'Too Many Requests. Please wait for some time' };
  }
}


async function getIpList( ctx ){
  const ips = await exec(`ip -6  a show dev ${ethDev} scope global | grep inet6 | awk '{print $2}'`)
  ctx.body = { ips : ips.split('\n').filter(v => v.length ).map( v => v.slice(0, -3)) };
}


async function addIp( ctx ){
  const ip = ctx.request.body.ip;
  try {
    await exec(`sudo ip -6 a add ${ip}/64 dev ${ethDev}`);
  } catch (e) {
    ctx.status = 409;
    ctx.body = { error: 'Failed to assign ip'};
    return;
  }

  // Remove ip after some time
  setTimeout(function(){
    exec(`sudo ip -6 a del dev ${ethDev} ${ip}/64`);
  },60*1000 );

  const ips = await exec(`ip -6  a show dev ${ethDev}| grep inet6.*global | awk '{print $2}'`);
  ctx.body = { ips : ips.split('\n').filter(v => v.length ).map( v => v.slice(0, -3)) };
}


async function logger( ctx, next ){
  const startTime = Date.now();
  await next();
  const requestTime = Date.now() - startTime;
  console.log(`${ctx.method} ${ctx.response.status} ${ctx.ip} "${ctx.request.headers['user-agent']}" - ${requestTime}`);
}


router.route({
  method: 'get',
  path: '/ips',
  validate: {
    output: {
      200: {
        body: {
          ips: MyJoi.ipv6Array()
        }
      }
    }
  },
  handler: getIpList
});


router.route({
  method: 'post',
  path: '/ips',
  validate: {
    body: {
      ip: MyJoi.ipv6()
    },
    type: 'json',
    output: {
      200: {
        body: {
          ips: MyJoi.ipv6Array()
        }
      }
    }
  },
  handler: addIp
});


app.use( logger );
app.use( require('koa-static')('./static') );
app.use( rateLimiterMiddleWare );
app.use( router.middleware() );
app.listen( 3553 );

