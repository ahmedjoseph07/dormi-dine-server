import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import Stripe from "stripe";

const app = express();
const port = 3000;
const uri = process.env.MONGO_URI;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Built-in middlewares
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);
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
const usersCollection = db.collection("users");
const reviewsCollection = db.collection("reviews");
const paymentsCollection = db.collection("payments");

app.get("/", (req, res) => {
    res.send("Welcome to DormiDome Server");
});

// Meals Route
app.get("/meals", async (req, res) => {
    const result = await mealsCollection.find({}).toArray();
    res.send(result);
});

app.get("/upcoming-meals", async (req, res) => {
    const result = await upcomingMealsCollection.find({}).toArray();
    res.send(result);
});

app.get("/api/meals/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const meal = await mealsCollection.findOne({ _id: new ObjectId(id) });
        if (!meal) return res.status(404).json({ message: "Meal not found" });
        res.send(meal);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch meal" });
    }
});

// Reviews Route

app.post("/api/add-review", async (req, res) => {
    const { mealId, name, email, comment, rating } = req.body;
    if (!mealId || !comment || !name || !email) {
        return res.status(400).json({ message: "Missing review fields" });
    }

    try {
        const review = {
            mealId,
            name,
            email,
            comment,
            rating: parseFloat(rating) || 0,
            timestamp: new Date(),
        };
        const result = await reviewsCollection.insertOne(review);
        res.status(201).json({
            message: "Review added",
            insertedId: result.insertedId,
        });
    } catch (err) {
        console.error("Error adding review:", err.message);
        res.status(500).json({ message: "Failed to post review" });
    }
});

app.get("/api/reviews/:mealId", async (req, res) => {
    try {
        const mealId = req.params.mealId;
        const reviews = await reviewsCollection
            .find({ mealId })
            .sort({ timestamp: -1 })
            .toArray();
        res.send(reviews);
    } catch (err) {
        console.error("Error fetching reviews:", err.message);
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
});


// Users Routes
app.post("/api/save-user", async (req, res) => {
    const { email, name } = req.body;
    if (!email || !name) {
        return res.status(400).json({ message: "Email and name are required" });
    }

    try {
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res
                .status(200)
                .json({ message: "User already exists", user: existingUser });
        }

        const newUser = {
            email,
            name,
            role: "user",
            joined: new Date(),
            package: "free",
        };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).json({ message: "User created", user: newUser });
    } catch (err) {
        console.error("Error saving user", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/api/user", async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.send({ message: "User email is required" });
    }
    try {
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.send(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/api/users/role", async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const user = await usersCollection.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ role: user.role || "user" });
    } catch (err) {
        console.error("Error fetching role:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Payments Routes
app.post("/api/create-payment-intent", async (req, res) => {
    const { packageName } = req.body;

    const priceMap = {
        silver: 999,
        gold: 1999,
        platinum: 2999,
    };

    const amount = priceMap[packageName.toLowerCase()];

    if (!amount) {
        return res.status(400).json({ message: "Invalid package name" });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: "usd",
            automatic_payment_methods: { enabled: true },
        });

        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Payment intent failed" });
    }
});

app.post("/api/save-payment", async (req, res) => {
    const {
        email,
        amount,
        method,
        status,
        transactionId,
        packageName,
    } = req.body;

    if (!email || !amount || !method || !status) {
        return res.status(400).json({ message: "Missing payment data" });
    }

    try {
        const payment = {
            email,
            date: new Date().toISOString().split("T")[0], // Store YYYY-MM-DD
            amount,
            method,
            status,
            transactionId,
            package: packageName || "free",
        };

        const result = await paymentsCollection.insertOne(payment);
        res.status(201).json({
            message: "Payment saved",
            insertedId: result.insertedId,
        });
    } catch (err) {
        console.error("Payment save error:", err.message);
        res.status(500).json({ message: "Failed to save payment" });
    }
});

app.get("/api/payment-history", async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ message: "Email required" });
    }

    try {
        const history = await paymentsCollection
            .find({ email })
            .sort({ date: -1 })
            .toArray();
        res.send(history);
    } catch (err) {
        console.error("Error fetching payments:", err.message);
        res.status(500).json({ message: "Failed to fetch payment history" });
    }
});

app.get("/api/already-paid", async (req, res) => {
    const { email, packageName } = req.query;
    if (!email || !packageName) {
        return res.status(400).json({ message: "Missing query params" });
    }

    try {
        const exists = await paymentsCollection.findOne({
            email,
            package: packageName.toLowerCase(),
            status: "Success",
        });

        if (exists) {
            return res.status(200).json({ alreadyPaid: true });
        }

        res.status(200).json({ alreadyPaid: false });
    } catch (err) {
        console.error("Error checking payment:", err.message);
        res.status(500).json({ message: "Failed to check payment status" });
    }
});

app.patch("/api/update-user-package", async (req, res) => {
    const { email, packageName } = req.body;

    if (!email || !packageName) {
        return res.status(400).json({ message: "Email and package name required" });
    }

    try {
        const result = await usersCollection.updateOne(
            { email },
            { $set: { package: packageName.toLowerCase() } }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "User package updated" });
        } else {
            res.status(200).json({ message: "No changes made" });
        }
    } catch (err) {
        console.error("Error updating user package:", err.message);
        res.status(500).json({ message: "Failed to update package" });
    }
});





app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
