import schemaParticipant from "./schemaParticipant.js";
import express, { json } from "express";
import cors from "cors";
import { MongoClient} from "mongodb";
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

app.listen(process.env.PORTA, ()=> {
    console.log("Back-end funcionando, nao esquece de desligar a cada atualizaçao")
});

