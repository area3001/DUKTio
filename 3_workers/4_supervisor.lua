local REDIS_HOSTNAME = 'localhost' --'5.9.25.67'
local REDIS_PORT = 6379
local worker_list_name = 'worker_alive_log'
local pretty = require 'pl.pretty'  -- penlight.pretty library to print nifty tables
local utils = require 'pl.utils'  -- penlight.util
local cjson_safe = require "cjson.safe"  -- fast C json decoding

local redis = require('redis')
local redis_conn = redis.connect(REDIS_HOSTNAME, REDIS_PORT)

print("**** In supervisor")

    while true do
      print ("=================================================")
      -- left pop message from Redis message_list queue

      print("  Checking workers")
      local worker_list = redis_conn:hgetall(worker_list_name)  -- gets all fields and values for a hash

      for k,v in pairs(worker_list) do
        -- each worker has an entry
        print("Worker " .. k )
        print("started at time ")
        print(type(v))
        print(v)
        message, err = cjson_safe.decode(message)
        print(message)
        if type(v) == "table" then
          for i,j in pairs(v) do print(i,j) end
        end
      end

      -- For each field (== worker) json decode the value
      -- Check the time of the creation 
      -- message_table, err = cjson_safe.decode(message_table[2])  -- first element is 'message-list'

      -- -- TODO: if err then log it and continu loop
      -- local to_routing = message_table['routing']['to']
      -- local subdomain, nodename, direction, port = unpack(utils.split(to_routing, ".", 1))  -- 1 for plain instead of regex

      -- -- retrieve the script to execute also based on path
      -- local query = '{"subdomain": "' .. subdomain .. '", "name": "' .. nodename .. '"}'   -- TODO: Add security here
      -- local q = assert(db:query('meteor.duks', query))
      -- local dukt = q:next()

    end

