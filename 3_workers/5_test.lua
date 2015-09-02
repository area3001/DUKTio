mqtt = require("mosquitto")  -- lua bindings by flukso (see github)
client = mqtt.new()

client.ON_CONNECT = function()
        print("connected")
        -- client:subscribe("$SYS/#")
        client:publish("my_topic", "RGBed")
end

--client.ON_MESSAGE = function(mid, topic, payload)
--        print(topic, payload)
--end

broker = arg[1] -- defaults to "localhost" if arg not set
client:connect(broker)
-- client:loop_forever()
client:loop_start()



