import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import {MongoClient,ServerApiVersion} from "mongodb";

const app = express();
const port = 3000;
const uri = process.env.MONGO_URI;


// Built-in middlewares
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}));
app.use(express.json());


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const db = client.db("dormi-dine");
const mealsCollection = db.collection("meals");


app.get("/",(req,res)=>{
    res.send("Welcome to DormiDome Server");
})



// Meals Route
app.get("/meals",async(req,res)=>{
    const result = await mealsCollection.find({}).toArray();
    res.send(result);
})



app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
