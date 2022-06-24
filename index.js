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











app.listen(5000, () => {
    console.log('Server is litening on port 5000.');
});