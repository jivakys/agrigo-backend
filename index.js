const express = require("express");
const cors = require("cors");
const { connection } = require("./config/db");
const { userRouter } = require("./routes/userRouter");
const { productRouter } = require("./routes/productRouter");
const { orderRouter } = require("./routes/orderRouter");
const app = express();
require("dotenv").config();

// Enable CORS first
app.use(
  cors({
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Then parse JSON
app.use(express.json());

// Basic test route
app.get("/", (req, res) => {
  res.send("Welcome to agriGo.");
});

// Routes
app.use("/auth/user", userRouter);
app.use("/products", productRouter);
app.use("/orders", orderRouter);

// Start server
app.listen(process.env.PORT, async () => {
  try {
    await connection;
    console.log("Connected to the Database");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
  console.log(`Server is running on port ${process.env.PORT}`);
});
