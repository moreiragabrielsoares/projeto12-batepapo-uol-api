import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();
import joi from 'joi';
import dayjs from 'dayjs';


const server = express();
server.use(express.json());
server.use(cors());


const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
    db = mongoClient.db('projeto12BatePapoUol');
});

async function connectDB () {
    try {

        await mongoClient.connect();
        db = mongoClient.db('projeto12BatePapoUol');

    } catch (error) {
        console.log('deu erro na conexão com o mongo');
        console.log(error);
    }
};

const TIME_15S = 15000;
const TIME_10S = 10000;

setInterval(verifyLastStatus, TIME_15S);

async function verifyLastStatus () {

    try {

        const participantsList = await db.collection('participants').find().toArray();

        for (let i = 0 ; i < participantsList.length ; i++) {

            if (Date.now() - participantsList[i].lastStatus > TIME_10S) {
            
                await db.collection('participants').deleteOne({ name: participantsList[i].name });

                const time = dayjs(Date.now()).format('HH:mm:ss');
                const logoutMsg = {from: participantsList[i].name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time};

                await db.collection('messages').insertOne(logoutMsg);
            }
        }

    } catch(error) {
        res.sendStatus(500);
    }

}


const participantNameSchema = joi.object({
    name: joi.string().required(),
});



server.post('/participants', async (req , res) => {

    //await connectDB();

    try {

        const participant = req.body;
        const validation = participantNameSchema.validate(participant, { abortEarly: true });

        if (validation.error) {
            res.sendStatus(422);
            //mongoClient.close();
            return;
        }

        const participantsList = await db.collection('participants').find().toArray();

        const found = participantsList.find(element => element.name === participant.name);

        if (found) {
            res.sendStatus(409);
            //mongoClient.close();
            return;
        }

        const newParticipant = {name: participant.name, lastStatus: Date.now()}

        await db.collection('participants').insertOne(newParticipant);

        const time = dayjs(Date.now()).format('HH:mm:ss');
        const loginMsg = {from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time};

        await db.collection('messages').insertOne(loginMsg);
        
        res.sendStatus(201);
        //mongoClient.close();

    } catch (error) {
        res.sendStatus(500);
        //mongoClient.close();
    }

});


server.get('/participants' , async (req, res) => {

    //await connectDB();

    try {
        
        const participantsList = await db.collection('participants').find().toArray();
        res.send(participantsList);
        //mongoClient.close();

    } catch (error) {
        
        res.sendStatus(500);
        //mongoClient.close();
    }

});







server.post('/messages', async (req , res) => {

    //await connectDB();

    try {

        const user = req.headers.user;
        
        const message = {from: user, ... req.body};

        const participantsList = await db.collection('participants').find().toArray();

        const participants = participantsList.map(element => element.name);


        const messageSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().valid('message', 'private_message'),
            from: joi.string().valid(... participants)
        });

        const validation = messageSchema.validate(message, { abortEarly: true });

        if (validation.error) {
            res.sendStatus(422);
            //mongoClient.close();
            return;
        }

        const time = dayjs(Date.now()).format('HH:mm:ss');
        
        const newMessage = {... message, time: time};

        await db.collection('messages').insertOne(newMessage);
        
        res.sendStatus(201);
        //mongoClient.close();

    } catch (error) {
        res.sendStatus(500);
        //mongoClient.close();
    }

});


server.get('/messages' , async (req, res) => {

    //await connectDB();


    try {
        
        const user = req.headers.user;

        const limit = parseInt(req.query.limit);

        const messagesList = await db.collection('messages').find().toArray();

        let newMessagesList = [];

        for (let i = 0 ; i < messagesList.length ; i++) {
            
            if(messagesList[i].to === 'Todos' || (messagesList[i].type === 'private_message' && (messagesList[i].to === user || messagesList[i].from === user)) || messagesList[i].type === 'message') {
                newMessagesList.push(messagesList[i]);
            }
        }

        if (limit) {
            newMessagesList = newMessagesList.slice(-limit);
        }

        res.send(newMessagesList);
        //mongoClient.close();

    } catch (error) {
        
        res.sendStatus(500);
        //mongoClient.close();
    }

});




server.post('/status' , async (req , res) => {

    //await connectDB();

    const user = req.headers.user;

    try {

        const participantsList = await db.collection('participants').find().toArray();

        const found = participantsList.find(element => element.name === user);

        if (!found) {
            res.sendStatus(404);
            //mongoClient.close();
            return;
        }

        await db.collection('participants').updateOne({ 
			name: user
		}, { $set: 
            {
                lastStatus: Date.now()
            } 
        });

        res.sendStatus(200);
        //mongoClient.close();

    } catch(error) {
        console.log('deu erro');
        console.log(error);
        res.sendStatus(500);
        //mongoClient.close();
    }



});



server.listen(5000, () => {
    console.log('Server is litening on port 5000.');
});