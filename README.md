# 🍽️ DormiDine Server

The backend server for **DormiDine**, a hostel meal management system. This server is built with **Node.js**, **Express**, and **MongoDB**, and uses **Firebase Admin** for authentication and **Stripe** for handling payments.

## 🔧 Tech Stack

- **Backend Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: Firebase JWT
- **Payment Gateway**: Stripe
- **Environment Management**: dotenv


## 📁 Project Structure
├── .env   
├── index.js  
├── package.json  
├── package-lock.json  
├── .gitignore

## 🔗 Live Site

- Frontend Live Site (Firebase) : [https://dormi-dine.web.app](https://dormi-dine.web.app)  
- Backend Live Site (Vercel) : [https://dormi-dine-server.vercel.app/](https://dormi-dine-server.vercel.app/)


## 📦 Database Collections (MongoDB)

- `meals` – Stores published meal information
- `upcoming-meals` – Contains future meals to be published
- `users` – Stores user information (admins, students, etc.)
- `reviews` – Contains meal review data
- `payments` – Tracks payment history via Stripe
- `requested-meals` – User-submitted meal requests

## 🔐 Authentication (JWT)
Firebase Admin SDK is used to verify JWT tokens from the client.

```js
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const idToken = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

```
## 💳 Stripe Integration
Stripe is used to handle payments.

```js
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
```

You can then create payment intents like this:
```js
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmountInCents,
  currency: "usd",
  payment_method_types: ["card"],
});

```

## 🔑 Environment Variables
Create a .env file and include the following:
```js
MONGO_URI=your_mongodb_connection_uri
STRIPE_SECRET_KEY=your_stripe_secret_key
FIREBASE_KEY=your_firebase_key(base-64)
```

## 🚀 Getting Started
Follow these steps to run the DormiDine backend server locally.

### 1. Clone the repository:

```
git clone https://github.com/ahmedjoseph07/dormi-dine-server.git
cd dormi-dine-server
``` 

### 2. Install dependencies: 

```
npm install
```

### 3. Set up your .env file with appropriate values.
```js
MONGO_URI=your_mongodb_connection_uri
STRIPE_SECRET_KEY=your_stripe_secret_key
FIREBASE_KEY=your_firebase_key(base-64)
```

### 4. Start the development server:
```
nodemon index.js
```



## 📘 API Reference – Meals

### 🔹 Get all meals

**Endpoint:** `GET /api/meals`

**Query Parameters:**

- `search` (string) – Search by meal title or description (optional)
- `category` (string) – Filter by category (e.g., "veg", "non-veg", etc.)
- `priceRange` (string) – "Below 80", "80-120", or "Above 120"
- `sortBy` (string) – Sort by `likes` or `reviews` (descending)

**Response:** Returns an array of meal objects.

---

### 🔹 Get a single meal by ID

**Endpoint:** `GET /api/meals/:id`

**URL Parameter:**

- `id` (string) – **Required.** ID of the meal to fetch

**Response:** Returns the specific meal object or 404 if not found.

---

### 🔹 Create a new meal

**Endpoint:** `POST /api/meals`

**Protected:** Yes (Requires `Authorization: Bearer <JWT>`)

**Body Parameters:**

- `title` (string)
- `category` (string)
- `ingredients` (array of strings)
- `description` (string)
- `price` (number)
- `postTime` (string)
- `image` (string)
- `distributorName` (string)
- `distributorEmail` (string)
- `rating` (number)
- `likes` (number)
- `reviewsCount` (number)
- `addedBy` (string)

**Response:** Returns success message and inserted meal ID.

---

### 🔹 Update a meal

**Endpoint:** `PATCH /api/meals/:id`

**Protected:** Yes

**Body Parameters (any):**

- `title`, `category`, `ingredients`, `description`, `price`, `postTime`, `image`

**Response:** Returns success message or 404 if meal not found.

---

### 🔹 Delete a meal

**Endpoint:** `DELETE /api/meals/:id`

**Protected:** Yes

**URL Parameter:**

- `id` (string) – **Required.** Meal ID to delete

**Response:** Returns success or error message.

---

### 🔹 Like / Unlike a meal

**Endpoint:** `POST /api/like/:mealId`

**Body Parameter:**

- `email` (string) – Email of user performing like/unlike

**Response:**
- If already liked: "Unliked successfully"
- If not liked yet: "Liked successfully"


## 📘 API Reference – Upcoming Meals

### 🔹 Get all upcoming meals

**Endpoint:** `GET /api/upcoming-meals`

**Response:** Returns an array of all upcoming meal objects.

---

### 🔹 Create a new upcoming meal

**Endpoint:** `POST /api/upcoming-meals`

**Protected:** Yes (Requires `Authorization: Bearer <JWT>`)

**Body Parameters:**

- `title` (string)
- `category` (string)
- `ingredients` (array of strings)
- `description` (string)
- `price` (number)
- `postTime` (string)
- `image` (string)
- `distributorName` (string)
- `distributorEmail` (string)
- `addedBy` (string)

**Response:** Returns success message and inserted upcoming meal ID.

---

### 🔹 Delete an upcoming meal

**Endpoint:** `DELETE /api/upcoming-meals/:id`

**Protected:** Yes

**URL Parameter:**

- `id` (string) – **Required.** Upcoming meal ID to delete

**Response:** Success message or 404 if meal not found.

---

### 🔹 Publish upcoming meal to live meals

**Endpoint:** `POST /api/publish-meal`

**Protected:** Yes

**Body Parameters:**

- `mealId` (string) – **Required.** ID of the upcoming meal
- `distributorEmail` (string) – **Required.** Email of admin publishing the meal

**Response:** Publishes meal to main collection and deletes it from upcoming. Returns success message and inserted ID.

---

### 🔹 Like / Unlike an upcoming meal

**Endpoint:** `POST /api/upcoming-like/:mealId`

**Body Parameter:**

- `email` (string) – Email of user performing like/unlike

**Response:**
- If already liked: "Unliked successfully"
- If not liked yet: "Liked successfully"


## 📘 API Reference – Requested Meals

### 🔹 Request a meal

**Endpoint:** `POST /api/request-meal`

**Protected:** Yes (Requires `Authorization: Bearer <JWT>`)

**Body Parameters:**

- `title` (string) – **Required.** Title of the meal
- `mealId` (string) – Optional: ID of the meal being requested
- `email` (string) – **Required.** Requesting user's email
- `name` (string) – **Required.** Name of the user
- `likes` (number) – Optional: Like count of the meal
- `reviewsCount` (number) – Optional: Review count of the meal

**Response:** Returns success message and inserted meal request ID.

---

### 🔹 Get requested meals

**Endpoint:** `GET /api/requested-meals`

**Protected:** Yes

**Query Parameters:**

- `email` (string) – Filter requests by user email
- `search` (string) – Search by email or name (case-insensitive)

**Response:** Returns an array of requested meals.

---

### 🔹 Serve a requested meal

**Endpoint:** `PATCH /api/requested-meals/:id/serve`

**Protected:** Yes

**URL Parameter:**

- `id` (string) – **Required.** ID of the requested meal

**Response:** Updates meal status to `served` and removes request from original meal.

---

### 🔹 Cancel a requested meal

**Endpoint:** `PATCH /api/requested-meals/:id/cancel`

**Protected:** Yes

**URL Parameter:**

- `id` (string) – **Required.** ID of the requested meal

**Response:** Updates meal status to `cancelled` and removes request from original meal.


# 📘 API Reference – Reviews

This document describes the REST API endpoints for managing **meal reviews** in the DormiDine application.

---

## 🔹 Add a Review

**Endpoint:** `POST /api/add-review`  
**Protected:**  Yes (Requires Firebase token via middleware)

**Body Parameters:**
- `mealId` (string) – **Required.** ID of the meal being reviewed
- `name` (string) – **Required.** Name of the reviewer
- `email` (string) – **Required.** Email of the reviewer
- `comment` (string) – **Required.** Review comment
- `rating` (number) – Rating between 0–5

**Response:**
- `201 Created` – Returns inserted review ID and success message
- Automatically updates the `rating` and `reviewsCount` in the meal document

---

## 🔹 Get All Reviews of a Meal

**Endpoint:** `GET /api/reviews/:mealId`

**URL Parameter:**
- `mealId` (string) – **Required.** ID of the meal

**Response:**  
Returns an array of all reviews for the specified meal, sorted by timestamp (most recent first).

---

## 🔹 Get Reviews by a User

**Endpoint:** `GET /api/user-reviews`  
**Protected:** Yes

**Query Parameters:**
- `email` (string) – **Required.** Email of the user

**Response:**  
Returns an array of reviews made by the user, enriched with the meal title.

---

## 🔹 Update a Review

**Endpoint:** `PATCH /api/reviews/:id`  
**Protected:** Yes

**URL Parameter:**
- `id` (string) – **Required.** ID of the review to update

**Body Parameters:**
- `comment` (string) – Updated review comment
- `rating` (number) – Updated rating

**Response:**
- Updates the review
- Recalculates and updates the `rating` and `reviewsCount` for the corresponding meal

---

## 🔹 Delete a Review

**Endpoint:** `DELETE /api/reviews/:id`  
**Protected:** Yes

**URL Parameter:**
- `id` (string) – **Required.** Review ID to delete

**Response:**
- Deletes the review
- Recalculates and updates the `rating` and `reviewsCount` for the associated meal

---

## 🔹 Get All Reviews (Admin)

**Endpoint:** `GET /api/all-reviews`  
**Protected:** Yes (Admin only)

**Response:**  
Returns all reviews across the platform along with:
- `mealTitle`
- `mealId`
- `likes`
- `reviewsCount`

Useful for admin dashboards and analytics.


# 📘 API Reference – Users

This document outlines the REST API endpoints for managing user accounts and roles in the DormiDine application.

All routes below require Firebase authentication (`verifyFirebaseToken` middleware) unless stated otherwise.

---

## 🔹 Save a User (Signup or First Login)

**Endpoint:** `POST /api/save-user`  
**Protected:** Yes

**Body Parameters:**
- `email` (string) – **Required.** User’s email address
- `name` (string) – **Required.** User’s display name

**Behavior:**
- If the user already exists, returns existing user.
- If new, creates user with default role `user`, package `free`, and saves `joined` date.

**Response:**
- `200 OK` – Existing user
- `201 Created` – New user created

---

## 🔹 Get a User by Email

**Endpoint:** `GET /api/user`  
**Protected:**  Yes

**Query Parameters:**
- `email` (string) – **Required.** Email of the user

**Response:**
- Returns the full user document
- `404` if user not found

---

## 🔹 Get All Users (Admin)

**Endpoint:** `GET /api/admin/users`  
**Protected:**  Yes (Admin only)

**Query Parameters:**
- `search` (optional string) – Filter users by name or email (case-insensitive)

**Response:**  
Returns an array of users with role `"user"`. Useful for admin dashboards.

---

## 🔹 Get a User’s Role

**Endpoint:** `GET /api/users/role`  
**Protected:** Yes

**Query Parameters:**
- `email` (string) – **Required.** Email of the user

**Response:**
- `{ "role": "user" }` or `{ "role": "admin" }`
- Returns `"user"` by default if no role is set
- `404` if user is not found

---

## 🔹 Promote User to Admin

**Endpoint:** `PUT /api/admin/users/:email/make-admin`  
**Protected:** Yes (Admin only)

**URL Parameter:**
- `email` (string) – **Required.** Email of the user to promote

**Behavior:**
- Updates the user’s `role` to `"admin"`
- Initializes `mealsAdded: 0` field for the user

**Response:**
- `200 OK` with confirmation message
- `404 Not Found` if user not found or already an admin

---

# 📘 API Reference – Payments & Dashboard

This document outlines the REST API endpoints for payment processing and dashboard statistics management in the DormiDine application.

All routes require Firebase authentication (`verifyFirebaseToken` middleware).

---

## 🔹 Create Payment Intent

**Endpoint:** `POST /api/create-payment-intent`  
**Protected:** Yes

**Body Parameters:**
- `packageName` (string) – **Required.** One of: `"silver"`, `"gold"`, `"platinum"`

**Behavior:**
- Creates a Stripe Payment Intent with the amount based on package.
- Amounts:
  - silver: $9.99 (999 cents)
  - gold: $19.99 (1999 cents)
  - platinum: $29.99 (2999 cents)

**Response:**
- `200 OK` with JSON `{ clientSecret: <string> }` for Stripe checkout
- `400 Bad Request` if invalid package name
- `500 Internal Server Error` on Stripe failure

---

## 🔹 Save Payment Record

**Endpoint:** `POST /api/save-payment`  
**Protected:** Yes

**Body Parameters:**
- `email` (string) – **Required.** User’s email
- `amount` (number) – **Required.** Payment amount in cents
- `method` (string) – **Required.** Payment method (e.g., `"card"`)
- `status` (string) – **Required.** Payment status (e.g., `"Success"`)
- `transactionId` (string) – Optional. Transaction identifier
- `packageName` (string) – Optional. Package name

**Behavior:**
- Saves payment details to database with date (`YYYY-MM-DD` format).

**Response:**
- `201 Created` with inserted record ID
- `400 Bad Request` if required fields are missing
- `500 Internal Server Error` on DB failure

---

## 🔹 Get Payment History

**Endpoint:** `GET /api/payment-history`  
**Protected:** Yes

**Query Parameters:**
- `email` (string) – **Required.** User’s email to fetch history for

**Response:**
- `200 OK` with array of payment records sorted by date descending
- `400 Bad Request` if email missing
- `500 Internal Server Error` on DB failure

---

## 🔹 Check If Already Paid

**Endpoint:** `GET /api/already-paid`  
**Protected:** Yes

**Query Parameters:**
- `email` (string) – **Required.** User’s email
- `packageName` (string) – **Required.** Package name to check

**Behavior:**
- Checks if a successful payment exists for the given user and package.

**Response:**
- `200 OK` with JSON `{ alreadyPaid: true | false }`
- `400 Bad Request` if parameters missing
- `500 Internal Server Error` on DB failure

---

## 🔹 Update User Package

**Endpoint:** `PATCH /api/update-user-package`  
**Protected:** Yes

**Body Parameters:**
- `email` (string) – **Required.** User’s email
- `packageName` (string) – **Required.** New package name

**Behavior:**
- Updates user’s package in user database.

**Response:**
- `200 OK` with confirmation message
- `400 Bad Request` if missing fields
- `500 Internal Server Error` on DB failure

---

## 🔹 Get Dashboard Statistics

**Endpoint:** `GET /api/dashboard-stats`  
**Protected:** Yes

**Response:** 
```json
{
  "users": 120,
  "mealsServed": 250,
  "reviews": 80,
  "revenue": 9999,
}
```

**Behavior:**
- Aggregates data from multiple collections in parallel.

---




## ⚠️ Notes

- All protected routes require a valid Firebase token passed to the `verifyFirebaseToken` middleware.
- After every **add**, **update**, or **delete**, the backend updates the average `rating` and `reviewsCount` of the associated meal to ensure consistency.
- Amounts for Stripe are in cents (USD).
- Payment `status` should be `"Success"` for confirmed transactions.
- The package names are case-insensitive but stored in lowercase.

---

## 📬 Contact
For any queries or support, reach out via:

📧 Email: `ahmedjoseph11@gmail.com`

Made with ❤️ by `JOSEPH AHMED` for comfort and efficient meal management in hostel.
