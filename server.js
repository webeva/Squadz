//Import all the required libraries
const redis = require("redis");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
const bodyParser = require('body-parser');
app.use(cors({origin: '*'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const http = require('http').createServer(app)
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

app.post("/create-new-user", async function (req, res){
  const request = req.body
  if (!client.isOpen) {
    await client.connect();
  }
  try{
    let users = JSON.parse(await client.get(`${process.env.DEV_VAR}${request.Type}user${request.UID}`));
    if(users){
      console.log("Already exist")
      res.status(200).send(`User with that ${request.Type} account already exists!`)
     
    }else{
      const response = await client.set(process.env.DEV_VAR + request.Type + "user" + request.UID, JSON.stringify(request))
      res.status(200).send("New user created")
    }
  }catch(error){
    console.log(error)
    return 
  }
})
app.get("/get-user-info/:id", async function(req, res){
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
})

app.post("/create-new-community", async function(req, res){
  const request = req.body
  if (!client.isOpen) {
    await client.connect();
  }
  try{
    const response = await client.set(process.env.DEV_VAR + "community" + request.UID, JSON.stringify(request))
  }catch(error){
    return {}
  }
})

app.get("/join-new-community")

app.get("/get-user-community/:id")
app.get("/get-community/:id")

app.get("/check-login/:id", async function(req,res){
  if (!client.isOpen) {
    await client.connect();
  }
  //Url paramater to get the chat
  let id = req.params.id;
  try {
    //Return chat messages if they were found
  
    const response = JSON.parse(await client.get(id))
    if(response){
      res.status(200).send(true)
      console.log("true")
    }else{
      res.status(200).send(false)
      console.log("false")
    }
  } catch (error) {
    //Or else just return an empty object
    console.log("false")
    res.status(200).send(false);
  }
})

















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
app.get("*", (req, res)=>{
  return res.send("server")
})
//Set up the socket.io serevr
const io = require("socket.io")(http, {
  cors: {
    origin: '*',
  }
})
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

  socket.on("send-chat-message", (room, message) => {
    //Format the message object
    const data = {
      V: 2, //Version number (int)
      community_id: room, //Community id (string)
      channel_id: "development", //Channel id (string)
      message_id: createMessageId(), //Message id (string)
      sender_public_key: "testaccount", //User's public key (string)
      message_type: "POST", //Message type (string)
      images: null, //Images if any (array)
      timestamp: Date.now(), //Curent timestamp (string)
      reply_id: null, //Reply id if any (string)
      replies: null, //Replies if any (array)
      message: message, //Message (string)
    };
    //Save the message in our Redis cache database
    saveMessage(data, id);
    //Save the message in our DeSo database
    axios
      .post(
        "https://97qtc0sfja.execute-api.us-east-1.amazonaws.com/default/SaharaMessageBot",
        data
      )
      .then((response) => console.log(response.data));
    //Broadcast the message to anybody connected to this room
    socket.broadcast.to(room).emit("chat-message", message);
  });
});
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


function createMessageId(){
    var length = 20,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?_.#@?/",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}