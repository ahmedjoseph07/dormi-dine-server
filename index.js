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
const requestedMealsCollection = db.collection("requested-meals");

app.get("/", (req, res) => {
    res.send("Welcome to DormiDome Server");
});

// Meals Route
app.get("/api/meals", async (req, res) => {
    const { search, category, priceRange } = req.query;
    const query = {};

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
        ];
    }

    if (category && category !== "All") {
        query.category = category.toLowerCase();
    }

    if (priceRange && priceRange !== "All") {
        if (priceRange === "Below 80") {
            query.price = { $lt: 80 };
        } else if (priceRange === "Above 120") {
            query.price = { $gt: 120 };
        } else {
            const [min, max] = priceRange.split("-").map(Number);
            query.price = { $gte: min, $lte: max };
        }
    }

    try {
        const meals = await mealsCollection.find(query).toArray();
        res.json(meals);
    } catch (error) {
        console.error("Meal fetch error:", error);
        res.status(500).json({ message: "Server error" });
    }
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

app.post("/api/like/:mealId", async (req, res) => {
    const { mealId } = req.params;
    const { email } = req.body;

    if (!email || !mealId) {
        return res.status(400).json({ message: "Missing email or mealId" });
    }

    try {
        const meal = await mealsCollection.findOne({
            _id: new ObjectId(mealId),
        });
        if (!meal) {
            return res.status(404).json({ message: "Meal not found" });
        }
        const isLikedBy = meal.isLikedBy || [];
        const alreadyLiked = meal.isLikedBy?.includes(email);
        let updatedDoc;

        if (alreadyLiked) {
            updatedDoc = {
                $pull: { isLikedBy: email },
                $inc: { likes: -1 },
            };
        } else {
            updatedDoc = {
                $addToSet: { isLikedBy: email },
                $inc: { likes: 1 },
            };
        }

        const result = await mealsCollection.updateOne(
            { _id: new ObjectId(mealId) },
            updatedDoc
        );

        res.json({
            message: alreadyLiked
                ? "Unliked successfully"
                : "Liked successfully",
        });
    } catch (err) {
        console.error("Error in liking API", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/api/upcoming-like/:mealId", async (req, res) => {
    const { mealId } = req.params;
    const { email } = req.body;

    if (!email || !mealId) {
        return res.status(400).json({ message: "Missing email or mealId" });
    }

    try {
        const meal = await upcomingMealsCollection.findOne({
            _id: new ObjectId(mealId),
        });
        if (!meal) {
            return res.status(404).json({ message: "Meal not found" });
        }
        const isLikedBy = meal.isLikedBy || [];
        const alreadyLiked = meal.isLikedBy?.includes(email);
        let updatedDoc;

        if (alreadyLiked) {
            updatedDoc = {
                $pull: { isLikedBy: email },
                $inc: { likes: -1 },
            };
        } else {
            updatedDoc = {
                $addToSet: { isLikedBy: email },
                $inc: { likes: 1 },
            };
        }

        const result = await upcomingMealsCollection.updateOne(
            { _id: new ObjectId(mealId) },
            updatedDoc
        );

        res.json({
            message: alreadyLiked
                ? "Unliked successfully"
                : "Liked successfully",
        });
    } catch (err) {
        console.error("Error in liking API", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/api/request-meal", async (req, res) => {
    const { title, mealId, email, name, likes, reviews } = req.body;

    if (!title || !email || !name) {
        return res
            .status(400)
            .json({ message: "Missing title, email, or name" });
    }

    const newRequest = {
        title,
        mealId,
        email,
        name,
        likes,
        reviews,
        status: "pending",
    };

    try {
        const result = await requestedMealsCollection.insertOne(newRequest);

        await mealsCollection.updateOne(
            { title },
            {
                $addToSet: { isRequestedBy: email },
            }
        );

        res.status(201).json({
            message: "Meal request submitted",
            insertedId: result.insertedId,
        });
    } catch (err) {
        console.error("Error requesting meal:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/api/requested-meals", async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "User email is required" });
    }

    try {
        const meals = await requestedMealsCollection.find({ email }).toArray();
        res.send(meals);
    } catch (err) {
        console.error("Error fetching requested meals:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.patch("/api/requested-meals/:id/cancel", async (req, res) => {
    try {
        const requestedMealId = req.params.id;
        const requestedMeal = await requestedMealsCollection.findOne({
            _id: new ObjectId(requestedMealId),
        });

        if (!requestedMeal) {
            return res
                .status(404)
                .json({ message: "Requested meal not found" });
        }

        const { mealId, email } = requestedMeal;

        const result = await requestedMealsCollection.updateOne(
            { _id: new ObjectId(requestedMealId) },
            { $set: { status: "cancelled" } }
        );

        if (result.modifiedCount === 0) {
            return res
                .status(404)
                .json({ message: "Meal not found or already cancelled" });
        }
        await mealsCollection.updateOne(
            { _id: new ObjectId(mealId) },
            { $pull: { isRequestedBy: email } }
        );

        res.json({ message: "Meal cancelled successfully" });
    } catch (err) {
        console.error("Cancel meal error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/api/meals", async (req, res) => {
    const {
        title,
        category,
        ingredients,
        description,
        price,
        postTime,
        image,
        distributorName,
        distributorEmail,
        rating,
        likes,
        reviewsCount,
        addedBy
    } = req.body;

    if (
        !title || !category || !ingredients || !description || !price ||
        !postTime || !image || !distributorName || !distributorEmail ||
        rating === undefined || likes === undefined || reviewsCount === undefined || !addedBy
    ) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {

        const meal = {
            title,
            category:category.toLowerCase(),
            ingredients:ingredients.map((ing) => ing.charAt(0).toUpperCase() + ing.slice(1).toLowerCase()),
            description,
            price,
            postTime,
            image,
            distributorName,
            distributorEmail,
            rating,
            likes,
            reviewsCount,
            addedBy,
        };


        const mealResult = await mealsCollection.insertOne(meal);
        const userResult = await usersCollection.updateOne(
            { email: addedBy, role: "admin" },
            { $inc: { mealsAdded: 1 } }
        );

        if (mealResult.insertedId) {
            res.status(201).json({
                message: "Meal added successfully",
                id: mealResult.insertedId,
            });
        } else {
            res.status(500).json({ message: "Failed to add meal" });
        }
    } catch (err) {
        console.error("Error adding meal:", err);
        res.status(500).json({ message: "Internal server error" });
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

app.get("/api/user-reviews", async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    try {
        const reviews = await reviewsCollection
            .find({ email })
            .sort({ timestamp: -1 })
            .toArray();

        // Attaching Meal Data (title)
        const mealIds = reviews.map((r) => new ObjectId(r.mealId));
        const meals = await mealsCollection
            .find({ _id: { $in: mealIds } })
            .toArray();

        const mealMap = {};
        meals.forEach((meal) => {
            mealMap[meal._id.toString()] = meal.title || "N/A";
        });

        const enriched = reviews.map((r) => ({
            ...r,
            title: mealMap[r.mealId] || "N/A",
        }));
        res.send(enriched);
    } catch (err) {
        console.error("Error fetching user reviews:", err.message);
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
});

app.patch("/api/reviews/:id", async (req, res) => {
    const { id } = req.params;
    const { comment, rating } = req.body;

    try {
        const result = await reviewsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { comment, rating } }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Review updated" });
        } else {
            res.status(200).json({ message: "No changes made" });
        }
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
});

app.delete("/api/reviews/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await reviewsCollection.deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount > 0) {
            res.send({ message: "Review deleted" });
        } else {
            res.status(404).json({ message: "Review not found" });
        }
    } catch (err) {
        console.error("Error deleting review:", err.message);
        res.status(500).json({ message: "Failed to delete review" });
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

app.get("/api/admin/users", async (req, res) => {
    const { search } = req.query;
    const baseQuery = { role: "user" };

    if (search) {
        baseQuery.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    try {
        const users = await usersCollection.find(baseQuery).toArray();
        res.send(users);
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

app.put("/api/admin/users/:email/make-admin", async (req, res) => {
    const { email } = req.params;
    if (!email) {
        return res.status(400).json({ message: "User email is required" });
    }

    try {
        const updateResult = await usersCollection.updateOne(
            { email },
            {
                $set: {
                    role: "admin",
                    mealsAdded: 0,
                },
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res
                .status(404)
                .json({ message: "User not found or already an admin" });
        }

        res.json({ message: "User promoted to admin successfully" });
    } catch (err) {
        console.error(err);
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
    const { email, amount, method, status, transactionId, packageName } =
        req.body;

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
        return res
            .status(400)
            .json({ message: "Email and package name required" });
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

// Server Listen
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
