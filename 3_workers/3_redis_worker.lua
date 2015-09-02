----------------------------------------------------------------
-- This file combines the worker and supervisor processes.
-- The parent (supervisor process) spawns the workers.
-- The worker always has state == "worker".
-- The supervisor process has "supervisor" and "spawning"
----------------------------------------------------------------

local REDIS_HOSTNAME = 'localhost' --'5.9.25.67'
local REDIS_PORT = 6379
local message_list_name = 'message_list'
local worker_list_name = 'worker_alive_log'
local pretty = require 'pl.pretty'  -- penlight.pretty library to print nifty tables
local utils = require 'pl.utils'  -- penlight.util for  
local cjson_safe = require "cjson.safe"  -- fast C json decoding
local sig = require "posix.signal"

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
  pretty = pretty -- TODO: need to disable this security-wise
}

local posix = require "posix"
local NUMBER_WORKERS = 10
local LIMIT_WORKER_RUNNING_DURATION_SECS = 5
local childPids = {}
for ii = 1, NUMBER_WORKERS do childPids[ii] = 0 end
local state = "spawning"
local supervisor_redis = require('redis')
local supervisor_redis_conn = supervisor_redis.connect(REDIS_HOSTNAME, REDIS_PORT)

----------------------------------------------------------------
-- This is the main loop for the forking process.
-- only the supervisor will reenter this loop
----------------------------------------------------------------
while true do 
  -- Timeslice
  posix.sleep(1)

  if state == "spawning" then
    for child_nr = 1, NUMBER_WORKERS do
      if childPids[child_nr] == 0 then
        print("State spawning: spawning child")
        local pid = posix.fork()

        if pid == 0 then
          -- in child state
          state = "worker" 
          break -- stop spawning in the child process
        else
          -- in supervisor state
          state = "supervisor" 
          -- if all went fine, note the child pid
          if pid > 0 then
            print("State spawning: spawned child:" .. pid)
            childPids[child_nr] = pid
          end

          -- if pid = -1 something went wrong with the spawning, just redo it ?
          if pid == -1 then
            print("State spawning: spawning failed, marking child for respawning:")
            childPids[child_nr] = 0   
          end 
        end    
      end
    end
  end

  -- SUPERVISOR
  if state == "supervisor" then
    -- In state supervisor, check the timings of the workers, and check the processes of the workers 

    -- if the worker has been working too long, kill it
    io.write(".")
    local worker_list = supervisor_redis_conn:hgetall(worker_list_name)  -- gets all fields and values for a hash
    for pid_worker, message in pairs(worker_list) do
      -- each worker that started a job has an entry
      message, err = cjson_safe.decode(message)  -- a string in redis, needs cjson_decode to convert to a table
      if type(message) == "table" then
        for i,j in pairs(message) do
          if i == "start_at" then
            -- a worker notes its start time in "j", if it's too long ago, kill it
            running_secs = os.time() - j
            print("running for " .. running_secs)
            if running_secs > LIMIT_WORKER_RUNNING_DURATION_SECS then
              print("State supervisor: killing worker: " .. pid_worker)
              -- TODO: Extra check that this workers pid exists in our child_pids list
              -- For now it's easy not to test, since it kills all previous workers too.
              sig.kill(pid_worker, sig.KILL)
              -- remove the worker's message from the redis
              supervisor_redis_conn:hdel(worker_list_name, pid_worker) 
            end
          end
        end
      end
    end

    -- check each worker process. If one finished/stopped/... , mark the process and enter the spawning state
    for child_nr = 1, NUMBER_WORKERS do
      if childPids[child_nr] > 0 then
        wait_childpid, wait_status_string, wait_status_int = posix.wait(childPids[child_nr], posix.WNOHANG)
        if not (wait_childpid == nil or wait_childpid == 0)  -- must contain the pid of the process terminated
            and (wait_status_string == "exited" 
                or wait_status_string == "killed" 
                or wait_status_string == "stopped") then
           -- Child finished, tag it for respawning
           print("State supervisor: Child " .. wait_childpid .. " " .. wait_status_string .. " due to: " .. wait_status_int)
           childPids[child_nr] = 0;
           state = "spawning"
        end
      end
    end
  end

  -- THE WORKER
  if state == "worker" then
    local worker_pid = posix.getpid('pid')
    print ("=================================================")
    print ("Started worker with pid: " .. worker_pid)
    print ("=================================================") 

    local redis = require('redis')
    local redis_conn = redis.connect(REDIS_HOSTNAME, REDIS_PORT)

    local mqtt = require("mosquitto")  -- lua bindings from Flukso: https://github.com/flukso/lua-mosquitto
    local mqtt_client = mqtt.new()
    mqtt_client:connect("localhost")
    mqtt_client:loop_start()

    function run_sandbox(sb_env, sb_func, scriptname, ...)
      -- log entering into redis hash for this worker (the supervisor needs this)
      -- e.g. a hash like 'process_pid: "{\"start_at\": 1231267323}" '   (yes, it's a unix timestamp)
      local message = {start_at=os.time()}
      message = cjson_safe.encode(message)
      print("Logging for supervisor")
      pretty.dump(message)
      redis_conn:hset(worker_list_name, worker_pid, message)

      if (not sb_func) then return nil end
     
      -- TODO: Add sanitization for scriptname
      local fun, message = load (sb_func, "tmp", "t" , sb_env) -- "t" for tables only
      if not fun then
        print("In run_sandbox: No function loaded")
        return nil, message
      end

      return pcall(fun)
    end

    local mongo = require('mongo')
    local db = assert(mongo.Connection.New())
    assert(db:connect('localhost:81'))

    while true do
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

      -- define print function
      function console(text)
        -- message = cjson_safe.encode(message)
        print ("In print: ")
        local query = '{"subdomain": "' .. subdomain .. '", "name": "' .. nodename .. '"}'
        local q = assert(db:query('meteor.duks', query))
        local dukt = q:next()

        if not (type(dukt.console) == "table") then
          dukt.console = {}
        end
        dukt.console[#dukt.console+1] = pretty.write(text)

        -- TODO: optimize with circular buffer
        while #dukt.console > 4 do
          table.remove(dukt.console, 1)
        end 

        -- {$set: {k: v}}
        local json_update = {["$set"] = {}}

        json_update["$set"]["console"] = dukt.console
        -- update(namespace, query, modifier, upsert, multi)
        return db:update('meteor.duks', query, json_update, true, false)
      end

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

            -- pretty.dump(config)
            -- pretty.dump(msg)

            if not ok then
                print("Mail send failed", err) -- better error handling required
            end
        end

        sendMessage(to, subject, text, config)

        -- print(ok)
        -- print(err)

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

      function mqtt_publish(topic, message)
        -- function to allow a dukt to send out an MQTT message to the localhost with the specified topic
        mqtt_client:publish(topic, message)
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
          sandbox_env_full.console = console
          sandbox_env_full.mqtt_publish = mqtt_publish
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
          sandbox_env.console = console
          sandbox_env.mqtt_publish = mqtt_publish          
        end

	      local script = dukt.code
        local pcall_rc, result_or_err_msg
        if subdomain == 'system' then
      	   pcall_rc, result_or_err_msg = run_sandbox(sandbox_env_full, script, dukt.name)
        else
           pcall_rc, result_or_err_msg = run_sandbox(sandbox_env, script, dukt.name)
        end
        -- clear the message on the supervisor hash in redis
        redis_conn:hdel(worker_list_name, worker_pid)

        -- write the result or error to the DB 
        if pcall_rc then
          -- Write succes in the logs
          result_or_err_msg = result_or_err_msg or ""
          query = '{"ref_dukt": "' .. dukt._id  .. '", ' ..
              '"result": "' .. string.gsub(result_or_err_msg, "[^a-zA-Z0-9_-]", " ") .. '", ' ..
              '"createdAt": ' .. mongo.Date(os.time())[1] .. ', ' ..
              '"userId": "' .. dukt.userId .. '"}'
          assert(db:insert('meteor.logs', query)) 

          -- write success in the lastlogs
          query_remove = '{"ref_dukt": "' .. dukt._id  .. '"}'
          query = '{"ref_dukt": "' .. dukt._id  .. '", ' ..
              '"result": "' .. string.gsub(result_or_err_msg, "[^a-zA-Z0-9_-]", " ") .. '", ' ..
              '"createdAt": ' .. mongo.Date(os.time())[1] .. ', ' ..
              '"userId": "' .. dukt.userId .. '"}'

          assert(db:remove('meteor.lastlogs', query_remove))
          assert(db:insert('meteor.lastlogs', query))
          print("pcall ok")
        else 
          -- Write fail in the logs
          -- TODO: make the substitution in function call sanitize() and call where needed
          result_or_err_msg = result_or_err_msg or ""
          query = '{"ref_dukt": "' .. dukt._id  .. '", ' ..
              '"result": "' .. string.gsub(result_or_err_msg, "[^a-zA-Z0-9_-]", " ") .. '", ' ..
              '"createdAt": ' .. mongo.Date(os.time())[1] .. ', ' ..
              '"userId": "' .. dukt.userId .. '"}'
          assert(db:insert('meteor.logs', query))   

          -- Write fail for lastlog
          query_remove = '{"ref_dukt": "' .. dukt._id ..'"}'
          query = '{"ref_dukt": "' .. dukt._id  .. '", ' ..
              '"result": "' .. string.gsub(result_or_err_msg, "[^a-zA-Z0-9_-]", " ") .. '", ' ..
              '"createdAt": ' .. mongo.Date(os.time())[1] .. ', ' ..
              '"userId": "' .. dukt.userId .. '"}'
       
          assert(db:remove('meteor.lastlogs', query_remove))
          assert(db:insert('meteor.lastlogs', query))

          print(result_or_err_msg)
          print("pcall failed")
        end 
      end
    end
  end
end