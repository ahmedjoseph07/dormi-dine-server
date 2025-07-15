import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import {MongoClient,ServerApiVersion} from "mongodb";
import Stripe from "stripe";

const app = express();
const port = 3000;
const uri = process.env.MONGO_URI;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)


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
const upcomingMealsCollection = db.collection("upcoming-meals");


app.get("/",(req,res)=>{
    res.send("Welcome to DormiDome Server");
})



// Meals Route
app.get("/meals",async(req,res)=>{
    const result = await mealsCollection.find({}).toArray();
    res.send(result);
})

app.get("/upcoming-meals",async(req,res)=>{
    const result = await upcomingMealsCollection.find({}).toArray();
    res.send(result);
})

// Payment Routes
app.post("/api/create-payment-intent",async(req,res)=>{
    const {packageName} = req.body;

    const priceMap = {
        silver: 999,
        gold:1999,
        platinum:2999
    }

    const amount = priceMap[packageName.toLowerCase()];

    if(!amount){
        return res.status(400).json({message:"Invalid package name"})
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: "usd",
            automatic_payment_methods: {enabled: true},
        })

        res.send({clientSecret:paymentIntent.client_secret});

    } catch (err) {
        console.error(err.message);
        res.status(500).json({message:"Payment intent failed"});
    }
})


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
