local redis = require 'redis'
local REDIS_HOSTNAME = 'localhost' --'5.9.25.67'
local REDIS_PORT = 6379
local message_list_name = 'message_list'
local pretty = require 'pl.pretty'  -- penlight.pretty library to print nifty tables
local cjson_safe = require "cjson"  -- fast C json decoding

-- save a pointer to globals that would be unreachable in sandbox
local e=_ENV

-- sample sandbox environment
sandbox_env = {
  ipairs = ipairs,
  next = next,
  pairs = pairs,
  pcall = pcall,
  tonumber = tonumber,
  tostring = tostring,
  type = type,
  unpack = unpack,
  coroutine = { create = coroutine.create, resume = coroutine.resume, 
      running = coroutine.running, status = coroutine.status, 
      wrap = coroutine.wrap },
  string = { byte = string.byte, char = string.char, find = string.find, 
      format = string.format, gmatch = string.gmatch, gsub = string.gsub, 
      len = string.len, lower = string.lower, match = string.match, 
      rep = string.rep, reverse = string.reverse, sub = string.sub, 
      upper = string.upper },
  table = { insert = table.insert, maxn = table.maxn, remove = table.remove, 
      sort = table.sort },
  math = { abs = math.abs, acos = math.acos, asin = math.asin, 
      atan = math.atan, atan2 = math.atan2, ceil = math.ceil, cos = math.cos, 
      cosh = math.cosh, deg = math.deg, exp = math.exp, floor = math.floor, 
      fmod = math.fmod, frexp = math.frexp, huge = math.huge, 
      ldexp = math.ldexp, log = math.log, log10 = math.log10, max = math.max, 
      min = math.min, modf = math.modf, pi = math.pi, pow = math.pow, 
      rad = math.rad, random = math.random, sin = math.sin, sinh = math.sinh, 
      sqrt = math.sqrt, tan = math.tan, tanh = math.tanh },
  os = { clock = os.clock, difftime = os.difftime, time = os.time },
}

function run_sandbox(sb_env, sb_func, ...)
  local sb_orig_env=_ENV
  if (not sb_func) then return nil end
  _ENV=sb_env
  local sb_ret={e.pcall(sb_func, ...)}
  _ENV=sb_orig_env
  return e.table.unpack(sb_ret)
end

local redis = redis.connect(REDIS_HOSTNAME, REDIS_PORT)
local mongo = require('mongo')
local db = assert(mongo.Connection.New())
assert(db:connect('localhost:3001'))

      print("q starting")
      q = assert(db:query('meteor.webhooks', '{"name": "myname1"}'))
      print("q returned")
     
      -- loop through the result set
      for result in q:results() do
        print(result.name)
      end



