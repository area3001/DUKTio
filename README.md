# DUKTio
Microservices, webscripts for IoT, open data, and much more.
Public version running at http://www.dukt.io

## Install instructions
+ Setup the system domain == an account tied to the "system" domain that contains the Lua code that allows to customize the internal handling of the messages, i.e. routing and bridges (http and mqtt) 
    + Make an account on your Dukt server
    + Go to profile and set the subdomain field to "system"
    + Go to Duks and add the following nodes (leave path, input and output ports blank):
        + click New Dukt:
            + name: ```router```
            + code: 
                ```
                print ("In system.router")
                pretty.dump(message)
                
                -- Get the sender info
                local routing_from = message.routing.from
                -- local subdomain, dukt, direction, port = unpack(utils.split(routing_from,".", 1))
                
                -- Get the endpoints
                local query = '{_id: "' .. message.routing.from .. '"}'
                local edges = assert(mongo_conn:query('meteor.edges', query))
                local endpoints = edges:next().endpoints
                pretty.dump(endpoints)
                
                -- Push 1 message for each endpoint to the worker queue
                for k,endpoint in pairs(endpoints) do
                  print("In endpoint " .. endpoint)
                  message.routing.to = endpoint
                  redis_conn:rpush("message_list", cjson.encode(message))
                end
                print ("Leaving system.router")
                return "ok"
                ```
        + click New Dukt:
            + name: ```http```
            + code: 
                ```
                print ("***** Entering system.http")
                -- console(pretty.write(message))
                
                -- Get the routing info for the user msg
                local subdomain = message.msg.subdomain
                local pathname = message.msg.pathname
                -- pathname = string.sub(pathname, 1)
                message.routing = {}
                
                -- Get the endpoints
                -- local query = '{_id: "httprequest|' .. subdomain ..'.' .. pathname .. '"}'   
                local query = '{"subdomain": "' .. subdomain .. '" , "pathname": "' .. pathname .. '"}'   -- TODO: Add security
                -- console ("Query: " .. query)
                local duks = assert(mongo_conn:query('meteor.duks', query)):results()
                -- pretty.dump(duks)
                
                -- Push 1 message for each dukt to the worker queue
                for duk in duks do
                  -- console("In system.http: queueing msg to duk " .. duk.name)
                  message.routing.to = subdomain .. "." .. duk.name .. ".in." .. pathname
                  redis_conn:rpush("message_list", cjson.encode(message))
                end
                print ("***** Leaving system.http")
                return "OK"
                ```
        + click New Dukt:
            + name: ```mqtt```
            + code: 
                ```
                -- This dukt loops over all subscribers and sends them the message
                print ("***** Entering system.mqtt")
                -- pretty.dump(message)
                
                -- Get the routing info for the user msg
                console(pretty.write(message))
                
                local subdomain = message.msg.subdomain
                local pathname = message.msg.pathname
                pathname = string.sub(pathname, 1)
                message.routing = {}
                
                -- Get the endpoints
                -- local query = '{_id: "httprequest|' .. subdomain ..'.' .. pathname .. '"}'   
                local query = '{"subdomain": "' .. subdomain .. '" , "pathname": "' .. pathname .. '"}'   -- TODO: Add security
                -- print ("Query: " .. query)
                local duks = assert(mongo_conn:query('meteor.duks', query)):results()
                -- pretty.dump(duks)
                
                -- make it that the user knows whether it's an publish or subscribe
                if message.routing == "system.mqtt.in.mqttpublish" then
                  message.msg.action = "publish"
                elseif message.routing == "system.mqtt.in.mqttsubscribe" then
                  message.msg.action = "subscribe"  
                end
                
                -- Push 1 message for each dukt to the worker queue
                for duk in duks do
                  print("In system.http: queueing msg to duk " .. duk.name)
                  message.routing.to = subdomain .. "." .. duk.name .. ".in." .. pathname
                  redis_conn:rpush("message_list", cjson.encode(message))
                end
                
                print ("***** Leaving system.mqtt")
                return "OK"
                ```                
## TODOS

+ Install instructions
    + nginx setup
+ Describe architecture
