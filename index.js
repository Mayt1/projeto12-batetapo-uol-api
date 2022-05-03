import schemaParticipant from "./schemaParticipant.js";
import schemaMessage from "./schemaMessage.js";
import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import { stripHtml } from "string-strip-html";
import dotenv from "dotenv";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

const app = express();
app.use(cors());
app.use(json());

let db;

app.post("/participants", async (req, res) => { //POST participants
    const { name } = req.body;
    const lastStatus = Date.now();
    const sanitizedName = stripHtml(name).result.trim();
    try {
        await mongoClient.connect();
        db = mongoClient.db(process.env.DATABASE);

        const isNameOnList = await db.collection("participants").findOne({ name: sanitizedName });
        if (isNameOnList) {
            console.log(`Usuário ${sanitizedName} já existe!`);
            return res.sendStatus(409);
        };

        const verification = await schemaParticipant.validateAsync({ name: sanitizedName, lastStatus });
        if (!verification.error) {
            await db.collection("participants").insertOne({ name: sanitizedName, lastStatus });
            await db.collection("messages").insertOne({ from: sanitizedName, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(lastStatus).format("HH:mm:ss") });
        } else {
            return res.sendStatus(422);
        }

        console.log(`Usuário foi criado`);
        res.status(201).send(sanitizedName);
        // mongoClient.close();
    } catch (e) {
        console.error(e);
        res.sendStatus(422);
        // mongoClient.close();
    }
});

app.get("/participants", async (req, res) => { // GET participants
    try {
        await mongoClient.connect();
        db = mongoClient.db(process.env.DATABASE);

        const participants = await db.collection("participants").find().toArray();
        res.send(participants);
        // mongoClient.close();
    } catch (e) {
        console.error(e);
        res.sendStatus(422);
        // mongoClient.close();
    }
});

app.post("/messages", async (req, res) => { // POST messages
    const { to, text, type } = req.body;
    const { user } = req.headers;

    const sanitizedTo = stripHtml(to).result.trim();
    const sanitizedText = stripHtml(text).result.trim();
    const sanitizedType = stripHtml(type).result.trim(); // Provavelmente não precisa mas fiz por precaução
    const sanitizedUser = stripHtml(user).result.trim();

    try {
        await mongoClient.connect();
        db = mongoClient.db(process.env.DATABASE);

        const haveNameList = await db.collection("participants").findOne({ name: sanitizedUser });
        if (!haveNameList) {
            console.log(`Usuário ${sanitizedUser} não está na lista/chat!`);
            return res.sendStatus(404);
        };

        const verification = await schemaMessage.validateAsync({ to: sanitizedTo, text: sanitizedText, type: sanitizedType, from: sanitizedUser });
        if (!verification.error) {
            console.log(`Mensagem de ${sanitizedUser} para ${sanitizedTo} passou nos testes com sucesso!`);
            await db.collection("messages").insertOne({ from: sanitizedUser, to: sanitizedTo, text: sanitizedText, type: sanitizedType, time: dayjs(Date.now()).format("HH:mm:ss") });
        } else {
            return res.sendStatus(422);
        }
        console.log(`Mensagem de ${sanitizedUser} para ${sanitizedTo} enviada com sucesso!`);
        res.sendStatus(201);
        // mongoClient.close();
    } catch (e) {
        console.error(e);
        res.sendStatus(422);
        // mongoClient.close();
    }
});

app.get("/messages", async (req, res) => { //GET messages
    const { limit } = req.query;
    const { user } = req.headers;

    try {
        function messageFilter(messageArrayData, comparator) {
            if (!messageArrayData) return true;
            return messageArrayData === comparator;
        }

        await mongoClient.connect();
        db = mongoClient.db(process.env.DATABASE);

        const haveUserCollection = await db.collection("messages").findOne({ to: user });
        const HaveFromCollection = await db.collection("messages").findOne({ from: user });
        if (!haveUserCollection && !HaveFromCollection) {
            return res.sendStatus(404);
        }

        const allMessages = await db.collection("messages").find().toArray();
        const filterMessages = allMessages.filter(message => {
            return messageFilter(message.type, "status")
                || messageFilter(message.type, "message")
                || (messageFilter(message.to, user) && messageFilter(message.type, "private_message"))
                || (messageFilter(message.from, user) && messageFilter(message.type, "private_message"));
        });

        const showMessages = filterMessages.slice(filterMessages.length - limit, filterMessages.length);
        if (!limit) {
            return res.send(filterMessages);
        }
        res.send(showMessages);
        // mongoClient.close();
    } catch (e) {
        console.error(e);
        res.sendStatus(422);
        // mongoClient.close();
    }
});

app.listen(process.env.PORTA, ()=> {
    console.log("Back-end funcionando, nao esquece de desligar a cada atualizaçao")
});

