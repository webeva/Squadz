//Import all the required libraries
const redis = require("redis");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
const bodyParser = require("body-parser");
app.use(cors({ origin: "*" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const http = require("http").createServer(app);
require("dotenv").config();

//Set up the Express server

http.listen(process.env.PORT, () => {
  console.log("App listening");
});

//Set up the Redis client
const client = redis.createClient({
  url: `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});
//Error handling for creating a Redis client
client.on("error", (err) => {
  console.log("Error in setting up Redis client: " + err);
});

app.post("/create-new-user", async function (req, res) {
  const request = req.body;
  if (!client.isOpen) {
    await client.connect();
  }
  try {
    let users = JSON.parse(
      await client.get(
        `${process.env.DEV_VAR}${request.Type}user${request.UID}`
      )
    );
    if (users) {
      console.log("Already exist");
      res
        .status(200)
        .send(`User with that ${request.Type} account already exists!`);
    } else {
      const response = await client.set(
        process.env.DEV_VAR + request.Type + "user" + request.UID,
        JSON.stringify(request)
      );
      res.status(200).send("New user created");
    }
  } catch (error) {
    console.log(error);
    return;
  }
});
app.get("/get-user-info/:id", async function (req, res) {
  if (!client.isOpen) {
    await client.connect();
  }
  //Url paramater to get the chat
  let id = req.params.id;
  try {
    //Return chat messages if they were found
    return res.send(JSON.parse(await client.get(id)));
  } catch (error) {
    //Or else just return an empty object
    return {};
  }
});
app.get("/get-user-chats/:id", async function (req, res) {
  if (!client.isOpen) {
    await client.connect();
  }
  //Url paramater to get the chat
  let id = req.params.id;
  const com = [];
  try {
    //Return chat messages if they were found

    const comi = JSON.parse(await client.get(id)).CommunityList;
    const community = comi.split("§");

    community.map(async function (value) {
      const response = await client.get(`$@community${value}`);
      if (response) {
        com.push(response);
      }

      if (com.length + 1 == community.length) {
        return res.status(200).send(JSON.stringify(com));
      }
    });
  } catch (error) {
    //Or else just return an empty object
    return {};
  }
});

app.get("/get-community-info/:id", async function (req, res) {
  if (!client.isOpen) {
    await client.connect();
  }
  //Url paramater to get the chat
  let id = req.params.id;
  try {
    //Return chat messages if they were found
    console.log(id);
    const community = await client.get(id);
    return res.send(JSON.parse(community));
  } catch (error) {
    //Or else just return an empty object
    return {};
  }
});

app.post("/create-new-community", async function (req, res) {
  const request = req.body;
  if (!client.isOpen) {
    await client.connect();
  }
  try {
    const chatRoom = await client.set(
      request.UID,
      '[{"V":2,"community_id":"null","channel_id":"null","message_id":"TheOriginalMessage","sender_public_key":"null","message_type":"FIRST","images":null,"timestamp":1669563313457,"reply_id":null,"replies":null,"message":""}]'
    );
    
    const response = await client.set(
      process.env.DEV_VAR + "community" + request.UID,
      JSON.stringify(request)
    );
    res.status(200).send(response);
  } catch (error) {
    return {};
  }
});

app.post("/leave-community", async function(req, res){
  if (!client.isOpen) {
    await client.connect();
  }
  try{
    const request = req.body;
    const response = JSON.parse(await client.get(request.Id));
    const responsetwo = JSON.parse(await client.get(`$@community${request.Chat}`))
    response["CommunityList"] = response.CommunityList.replace(`§${request.Chat}`, "")
    let desokey = "§" + request.Id.replace("$@DeSouser","")
    
    responsetwo["Users"] = responsetwo.Users.replace(desokey, "")
    
    const result = await client.set(request.Id, JSON.stringify(response));
    const resultwo = await client.set(`$@community${request.Chat}`, JSON.stringify(responsetwo))
    res.status(200).send(result);

  }catch(error){
    console.log(error)
    return
  }
})

app.post("/join-new-community", async function (req, res) {
  if (!client.isOpen) {
    await client.connect();
  }
  try {
    const request = req.body;

    const response = JSON.parse(await client.get(request.UID));
    const responsetwo = JSON.parse(await client.get(`$@community${request.Id}`))
    if(response.CommunityList.includes(request.Id)){
      res.status(200).send("Cannot join community again!")
      return
    }
    response["CommunityList"] = response.CommunityList + `§${request.Id}`;
    let newUser = request.UID.replace("$@DeSouser", "")
    responsetwo["Users"] = responsetwo.Users + `§${newUser}`
    const result = await client.set(request.UID, JSON.stringify(response));
    const resulttwo = await client.set(`$@community${request.Id}`, JSON.stringify(responsetwo))
    res.status(200).send(result);
  } catch (error) {
    console.log(error);
    return {};
  }
});

app.get("/check-login/:id", async function (req, res) {
  if (!client.isOpen) {
    await client.connect();
  }
  //Url paramater to get the chat
  let id = req.params.id;
  try {
    //Return chat messages if they were found

    const response = JSON.parse(await client.get(id));
    if (response) {
      res.status(200).send(true);
      console.log("true");
    } else {
      res.status(200).send(false);
      console.log("false");
    }
  } catch (error) {
    //Or else just return an empty object
    console.log("false");
    res.status(200).send(false);
  }
});
app.get("/get-community-list", async function (req, res) {
  if (!client.isOpen) {
    await client.connect();
  }
  try {
    //Return chat messages if they were found
    const response = JSON.parse(await client.get("$@Discover"));
    res.status(200).send(response);
  } catch (error) {
    //Or else just return an empty object
    console.log("false");
    res.status(200).send(false);
  }
});
app.post("/add-community-list", async function (req, res) {
  if (!client.isOpen) {
    await client.connect();
  }
  try {
    const request = req.body;
    //Get the current chat messages in the form of an array
    let chat_list = JSON.parse(await client.get("$@Discover"));
    //Push the new message to the array
    chat_list.push(request);
    //Store the message in Redis
    client.set("$@Discover", JSON.stringify(chat_list));
    res.status(200).send(JSON.stringify(chat_list));
  } catch (error) {
    console.log(error);
    return;
  }
});
//REST Api to get all the messages for a chat in Redis
app.get("/get-messages/:id", async function (req, res) {
  if (!client.isOpen) {
    await client.connect();
  }
  //Url paramater to get the chat
  let id = req.params.id;
  try {
    //Return chat messages if they were found
    return res.send(JSON.parse(await client.get(id)));
  } catch (error) {
    //Or else just return an empty object
    return {};
  }
});
app.get("*", (req, res) => {
  return res.send("server");
});
//Set up the socket.io serevr
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});
//Runs on connection
io.on("connection", (socket) => {
  //Receive the name of the chat currently in
  const id = socket.handshake.query.chat;
  //Subcribe to that chat
  if (id) {
    socket.join(id);
  }

  //Runs whenever a message is sent
  //@params roomname string and message string

  socket.on("send-chat-message", (room, message, channel, image, user, name, profile) => {
      //Format the message object
      let messageId =  createMessageId()
      const data = {
        V: 2, //Version number (int)
        community_id: room, //Community id (string)
        channel_id: channel, //Channel id (string)
        message_id: messageId, //Message id (string)
        sender_public_key: user, //User's public key (string)
        message_type: "POST", //Message type (string)
        images: image, //Images if any (array)
        timestamp: Date.now(), //Curent timestamp (string)
        reply_id: null, //Reply id if any (string)
        replies: null, //Replies if any (array)
        message: message, //Message (string)
        Name: name,
        Profile: profile,
      };
      
      //Save the message in our Redis cache database
      saveMessage(data, id);
      //Save the message in our DeSo database
     
      //Broadcast the message to anybody connected to this room
      socket.broadcast.to(room).emit("chat-message", JSON.stringify(data));
      sendPost(room, message, channel, image, user, name, profile, messageId)
      
    }
  );
});
async function sendPost(room, message, channel, image, user, name, profile, messageId){
      if (!client.isOpen) {
        await client.connect();
      }
      let username = JSON.parse(await client.get("$@community" + room)).Deso;
      

      const data2 = {
        community_id: room, //Community id (string)
        channel_id: channel, //Channel id (string)
        message_id: messageId, //Message id (string)
        sender_public_key: username, //User's public key (string)
        message_type: "POST", //Message type (string)
        images: JSON.stringify(image), //Images if any (array)
        timestamp: JSON.stringify(Date.now()), //Curent timestamp (string)
        reply_id: "null", //Reply id if any (string)
        replies: "null", //Replies if any (array)
        message: message, //Message (string)
      }
      const response = await axios.post("https://97qtc0sfja.execute-api.us-east-1.amazonaws.com/default/SaharaMessageBot",data2).then((response) => console.log("Hi" + response));
      return response
}
//Function that saves the messages to our Redis cache database
async function saveMessage(message, id) {
  //Check if the client is already open
  //If it is not then connect to the Redis server
  if (!client.isOpen) {
    await client.connect();
  }
  try {
    //Get the current chat messages in the form of an array
    let chat_messages = JSON.parse(await client.get(id));
    //Push the new message to the array
    chat_messages.push(message);
    //Store the message in Redis
    client.set(id, JSON.stringify(chat_messages));
  } catch (error) {
    //Set the current chat messages to that one message array
    chat_messages = [message];
    //Store the message in the Redis database
    client.set(id, JSON.stringify(chat_messages));
  }
}

function createMessageId() {
  var length = 20,
    charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?_.#@?/",
    retVal = "";
  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}
