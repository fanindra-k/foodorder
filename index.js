const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3001;

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

function isAuthenticated(req, res, next) {
  if (req.session.user) {
      return next();
  } else {
      res.redirect('/login');
  }
}


app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});


app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
// code

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://himanshukr116:@Moon1234@cluster0.trvifck.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

//code
const User = require("./model/user");
const Item = require("./model/item");
const Order = require("./model/order");

app.get("/", (req, res) => {
  
  res.render("home", {total: 0});
});

app.get("/register", (req, res) => {
  res.render("register", {error:null});
});

app.get("/about", (req, res) => {
  res.render("about", {total: 0});
});

app.post("/register", async (req, res) => {
  try {
    const { fName, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      res.render("register", { error: "Ashok Singh Password Not Match" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.render("register", { error: "User with this email already exists!" });
    }
    const hashedPassword = await bcrypt.hash(password, 5);
    const user = new User({
      fName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });
    await user.save();
    res.redirect("/login");
  } catch (error) {
    res.render("register", { error: "Hi Ashok Singh Kuch To Dikat hai  " });
  }
});

app.get("/login", async (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the password is correct
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Save user information in session
    req.session.user = {name: user.fName, id: user._id, email: user.email };

    // Set a cookie to indicate user is logged in
    res.cookie("isLoggedIn", true, { maxAge: 86400000, httpOnly: true }); // Adjust maxAge as needed

    // Redirect to dashboard route after successful login
    res.redirect("/");
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Something went wrong while logging in." });
  }
});

app.get("/menu", async (req, res) => {
  const items = await Item.find({});
  res.render("menu", { items: items, total: 0 });
});

app.post("/add-to-cart", async (req, res) => {
  const itemId = req.body.itemId;

  if (!req.session.cart) {
    req.session.cart = [];
  }

  try {
    const item = await Item.findById(itemId);
    if (item) {
      const cartItem = req.session.cart.find(
        (cartItem) => cartItem._id.toString() === item._id.toString()
      );
      if (cartItem) {
        cartItem.quantity += 1;
      } else {
        req.session.cart.push({ ...item.toObject(), quantity: 1 });
      }
      res.redirect("/menu");
    } else {
      res.status(404).send("Item not found");
    }
  } catch (err) {
    console.error(err);
    res.redirect("/menu");
  }
});

// app.get("/cart", (req, res) => {
//   const cart = req.session.cart || [];
//   res.render("cart", { cart: cart });
// });

app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  res.render('cart', { cart: cart, total: total });
});

app.get("/items/new", (req, res) => {
  res.render("newItem", {total: 0});
});

app.post("/items", async (req, res) => {
  const { name, price, img, categeory, discreption } = req.body;
  const newItem = new Item({ name, price, img, categeory, discreption });
  await newItem.save();
  res.redirect("/menu");
});

// Route to display past orders


app.get('/orders', async (req, res) => {
  if (!req.session.user) {
      return res.redirect('/login');
  }

  const userId = req.session.user.id;

  try {
      const orders = await Order.find({ user: userId }).populate('items.item');
      res.render('orders', { orders, total: 0});
  } catch (err) {
      console.error(err);
      res.redirect('/');
  }
});


// Checkout route
app.post('/checkout', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const cart = req.session.cart || [];
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const orderId = uuidv4();

  try {
      const order = new Order({
          orderId: orderId,
          user: userId,
          items: cart.map(item => ({
              item: item._id,
              quantity: item.quantity
          })),
          total: total
      });

      await order.save();
      req.session.cart = [];  // Clear the cart after placing the order
      req.session.orderId = orderId;  // Store orderId in session to show on confirmation page
      res.redirect('/order-confirmation');
  } catch (err) {
      console.error(err);
      res.redirect('/cart');
  }
});

app.get('/order-confirmation', isAuthenticated, async (req, res) => {
  const orderId = req.session.orderId;

  try {
      const order = await Order.findOne({ orderId: orderId }).populate('items.item');
      if (!order) {
          return res.redirect('/');
      }
      res.render('orderConfirmation', { order, formatDate: (date) => new Date(date).toDateString() });
  } catch (err) {
      console.error(err);
      res.redirect('/');
  }
});



app.get('/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          return res.redirect('/');
      }
      res.clearCookie('isLoggedIn');
      res.redirect('/');
  });
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
