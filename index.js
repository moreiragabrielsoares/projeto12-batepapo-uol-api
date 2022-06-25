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

async function connectDB () {
    try {

        await mongoClient.connect();
        db = mongoClient.db('projeto12BatePapoUol');

    } catch (error) {
        console.log(error);
    }
};


const participantNameSchema = joi.object({
    name: joi.string().required(),
});



server.post('/participants', async (req , res) => {

    await connectDB();

    try {

        const participant = req.body;
        const validation = participantNameSchema.validate(participant, { abortEarly: true });

        if (validation.error) {
            res.sendStatus(422);
            mongoClient.close();
            return;
        }

        const participantsList = await db.collection('participants').find().toArray();

        const found = participantsList.find(element => element.name === participant.name);

        if (found) {
            res.sendStatus(409);
            mongoClient.close();
            return;
        }

        const newParticipant = {name: participant.name, lastStatus: Date.now()}

        await db.collection('participants').insertOne(newParticipant);

        const time = dayjs(Date.now()).format('HH:mm:ss');
        const loginMsg = {from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time};

        await db.collection('messages').insertOne(loginMsg);
        
        res.sendStatus(201);
        mongoClient.close();

    } catch (error) {
        res.sendStatus(500);
        mongoClient.close();
    }

});


server.get('/participants' , async (req, res) => {

    await connectDB();

    try {
        
        const participantsList = await db.collection('participants').find().toArray();
        res.send(participantsList);
        mongoClient.close();

    } catch (error) {
        
        res.sendStatus(500);
        mongoClient.close();
    }

});







server.post('/messages', async (req , res) => {

    await connectDB();

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

        console.log(validation.error);

        if (validation.error) {
            res.sendStatus(422);
            mongoClient.close();
            return;
        }

        const time = dayjs(Date.now()).format('HH:mm:ss');
        
        const newMessage = {... message, time: time};

        await db.collection('messages').insertOne(newMessage);
        
        res.sendStatus(201);
        mongoClient.close();

    } catch (error) {
        res.sendStatus(500);
        mongoClient.close();
    }

});





server.listen(5000, () => {
    console.log('Server is litening on port 5000.');
});