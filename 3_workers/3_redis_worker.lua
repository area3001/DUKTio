local REDIS_HOSTNAME = 'localhost' --'5.9.25.67'
local REDIS_PORT = 6379
local message_list_name = 'message_list'
local pretty = require 'pl.pretty'  -- penlight.pretty library to print nifty tables
local utils = require 'pl.utils'  -- penlight.util for  
local cjson_safe = require "cjson.safe"  -- fast C json decoding

-- save a pointer to globals that would be unreachable in sandbox
local e = _ENV

-- sample sandbox environment
local sandbox_env = {
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
  print = print,  -- TODO: need to disable this security-wise
  pretty = pretty
}


function run_sandbox(sb_env, sb_func, scriptname, ...)
  if (not sb_func) then return nil end
 
  -- TODO: Add sanitization for scriptname
  local fun, message = load (sb_func, "tmp", "t" , sb_env) -- "t" for tables only 
  if not fun then
    print("In run_sandbox: No function loaded")
    return nil, message
  end

  return pcall(fun)
end


local redis = require('redis')
local redis_conn = redis.connect(REDIS_HOSTNAME, REDIS_PORT)
local mongo = require('mongo')
local db = assert(mongo.Connection.New())
assert(db:connect('localhost:81'))

    while true do
      print ("=================================================")
      -- left pop message from Redis message_list queue
      local message_table = redis_conn:blpop(message_list_name, 0)
      print("**** In worker")
      pretty.dump(message_table)
      message_table, err = cjson_safe.decode(message_table[2])  -- first element is 'message-list'

      -- TODO: if err then log it and continu loop
      local to_routing = message_table['routing']['to']
      local subdomain, nodename, direction, port = unpack(utils.split(to_routing, ".", 1))  -- 1 for plain instead of regex

      -- retrieve the script to execute also based on path
      local query = '{"subdomain": "' .. subdomain .. '", "name": "' .. nodename .. '"}'   -- TODO: Add security here
      local q = assert(db:query('meteor.duks', query))
      local dukt = q:next()

      -- define send_out as a closure (using upvalues subdomain and nodename)
      function call_node(node_identifier, msg)
        -- route message to system router dukt
        -- TODO: sanity check on portid
        local message = {
          routing = {
            to = 'system.router.in.endpoint',
            from = subdomain .. "." .. nodename .. "." .. "out" .. "." .. portid
          },
          msg = msg,
        }
        -- encode and send to redis queue
        pretty.dump(message)
        message = cjson_safe.encode(message)
        print ("In send_out: queuing msg")
        redis_conn:rpush('message_list', message)
        print ("In send_out: msg queued succesfully")

        return
      end

      -- define send_out as a closure (using upvalues subdomain and nodename)
      function send_out(portid, msg)
        -- route message to system router dukt
        -- TODO: sanity check on portid
        local message = {
          routing = {
            to = 'system.router.in.endpoint',
            from = subdomain .. "." .. nodename .. "." .. "out" .. "." .. portid
          },
          msg = msg,
        }
	      -- encode and send to redis queue
        pretty.dump(message)
	      message = cjson_safe.encode(message)
        print ("In send_out: queuing msg")
        redis_conn:rpush('message_list', message)
        print ("In send_out: msg queued succesfully")
      end
      
      function email_send(to, subject, text, config)
      -- http://stackoverflow.com/questions/11070623/lua-send-mail-with-gmail-account
        -- email.send ({
        --   to='<TO_ADDRESS>',
        --   subject='Received payment',
        --   text='Amount: $'..(object.amount/100)
        --   config = {smtp='<SMTP SERVER>', 
        --             username='<SMTP USERNAME>',
        --             password='<SMTP PASSWORD>',
        --             from='<FROM_ADDRESS>',
        --             port='<SMTP PORT>' 
        --             },
        --   })

        -- TODO: Need thorough argument checking here
        -- TODO: If config is empty, get the email.config settings

        local socket = require 'socket'
        local smtp = require 'socket.smtp'
        local ssl = require 'ssl'
        local https = require 'ssl.https'
        local ltn12 = require 'ltn12'

        function sslCreate()
            local sock = socket.tcp()
            return setmetatable({
                connect = function(_, host, port)
                    local r, e = sock:connect(host, port)
                    if not r then return r, e end
                    sock = ssl.wrap(sock, {mode='client', protocol='tlsv1'})
                    return sock:dohandshake()
                end
            }, {
                __index = function(t,n)
                    return function(_, ...)
                        return sock[n](sock, ...)
                    end
                end
            })
        end

        function sendMessage(to, subject, body, config)
            local msg = {
                headers = {
                    to = to,
                    subject = subject
                },
                body = body
            }

            local ok, err = smtp.send {
                from = "<" .. config.from .. ">",
                rcpt = "<" .. to .. ">",
                source = smtp.message(msg),
                user = config.username,
                password = config.password,
                server = config.smtp,
                port = config.port,
                create = sslCreate
            }

            pretty.dump(config)
            pretty.dump(msg)

            if not ok then
                print("Mail send failed", err) -- better error handling required
            end
        end

        sendMessage(to, subject, text, config)

        print(ok)
        print(err)

        -- TODO: Need our own error handling
        return ok, err
      end

      -- dukt_storage for persistant local state to this node 
      dukt_storage_mt = {
        __index = function (_, k)
          -- retrieve the storage field in the dukt document
          local query = '{"subdomain": "' .. subdomain .. '", "name": "' .. nodename .. '"}'
          local q = assert(db:query('meteor.duks', query))
          local dukt = q:next()
          if dukt then return dukt[k] end
          return nil
        end,
        __newindex = function (_, k, v)
          -- store the storage field in the dukt document
          local query = '{"subdomain": "' .. subdomain .. '", "name": "' .. nodename .. '"}'
          -- {$set: {k: v}}
          local json_update = {["$set"] = {}}
          json_update["$set"][k] = v
          -- update(namespace, query, modifier, upsert, multi)
          return db:update('meteor.duks', query, json_update, true, false)
        end
      } 

      dukt_storage = {}
      dukt_storage.__metatable = "A wise man once wrote: not your business"

      setmetatable(dukt_storage, dukt_storage_mt)


      function sandbox_http (url) 
        -- url – The target URL, including scheme, e.g. http://example.com
        -- method (optional, default is "GET") – The HTTP verb, e.g. GET or POST
        -- data (optional) – Either a string (the raw bytes of the request body) or a table (converted to form POST parameters)
        -- params (optional) – A table that's converted into query string parameters. E.g. {color="red"} becomes ?color=red
        -- auth (optional) – Two possibilities:
        -- auth={'username', 'password'} means to use HTTP basic authentication
        -- auth={oauth={consumertoken='...', consumersecret='...', accesstoken='...', tokensecret='...'}} means to sign the request with OAuth. Only consumertoken and consumersecret are required (e.g. for obtaining a request token)
        -- headers (optional) – A table of the request header key/value pairs

        -- A call to http.request returns a table with the following fields:
        -- content – The raw bytes of the HTTP response body, after being decoded if necessary according to the response's Content-Encoding header.
        -- statuscode – The numeric status code of the HTTP response
        -- headers – A table of the response's headers
        local http = require("socket.http")

        -- using the simple http request method for now, see http://w3.impa.br/~diego/software/luasocket/http.html
        return http.request(url)

      end

      -- this block executes system as well as userland dukts
      if dukt then

        -- disable the sandbox for system dukts
        -- also add the DBes, and whatever you need (you can't access local variables in the global scope)
        if subdomain == 'system' then
          print("system sandbox")
          sandbox_env_full = e -- hence no sandbox
          sandbox_env_full.mongo_conn = db
          sandbox_env_full.redis_conn = redis_conn
          sandbox_env_full.pretty = pretty
          sandbox_env_full.message = message_table
          sandbox_env_full.cjson = cjson_safe
          sandbox_env_full.storage = dukt_storage
          sandbox_env_full.http = {}
          sandbox_env_full.http.request = sandbox_http
         else
          -- add the msg to the sandbox
          print("user sandbox")
          sandbox_env.msg = message_table.msg
          sandbox_env.send_out = send_out
          sandbox_env.email = {}
          sandbox_env.email.send = email_send
          sandbox_env.storage = dukt_storage
          sandbox_env.http = {}
          sandbox_env.http.request = sandbox_http
        end

	      local script = dukt.code
        local pcall_rc, result_or_err_msg
        if subdomain == 'system' then
      	   pcall_rc, result_or_err_msg = run_sandbox(sandbox_env_full, script, dukt.name)
        else
           pcall_rc, result_or_err_msg = run_sandbox(sandbox_env, script, dukt.name)
        end

        -- write the result or error to the DB 
        if pcall_rc then
          -- success
          result_or_err_msg = result_or_err_msg or ""
          query = '{"ref_dukt": "' .. dukt._id  .. '", ' ..
              '"result": "' .. string.gsub(result_or_err_msg, "[^a-zA-Z0-9_-]", " ") .. '", ' ..
              '"createdAt": ' .. mongo.Date(os.time())[1] .. ', ' ..
              '"userId": "' .. dukt.userId .. '"}'
          -- print(query)
          assert(db:insert('meteor.logs', query)) 
          print("pcall ok")
        else 
          -- error
          -- TODO: make the substitution in function call sanitize() and call where needed
          result_or_err_msg = result_or_err_msg or ""
          query = '{"ref_dukt": "' .. dukt._id  .. '", ' ..
              '"result": "' .. string.gsub(result_or_err_msg, "[^a-zA-Z0-9_-]", " ") .. '", ' ..
              '"createdAt": ' .. mongo.Date(os.time())[1] .. ', ' ..
              '"userId": "' .. dukt.userId .. '"}'
          assert(db:insert('meteor.logs', query))
          print(result_or_err_msg)
          print("pcall failed")
        end 
      end
    end

