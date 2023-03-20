import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import { auth } from "./middleware/auth.js";
import shortid from "shortid";
import Razorpay from "razorpay";

// const shortids = shortid()
// const Razorpaye = Razorpay();
// import shortid from "shortid";
// import Razorpay  from "razorpay";
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;
// const MONGO_URL = "mongodb://127.0.0.1";
const client = new MongoClient(MONGO_URL); // dial
// Top level await
await client.connect(); // call
console.log("Mongo is connected !!!  ");
async function generateHashedpassword(password) {
  const NO_OF_ROUNDS = 10;
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}
app.get("/allitem", async function (request, response) {
  const alldata = await client
    .db("rentalshop")
    .collection("pageitems")
    .find({})
    .toArray();
  response.send(alldata);
});
app.get("/find/:id", async function (request, response) {
  const sddd = request.params.id;
  const alldata = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .findOne({ post: { $elemMatch: { prodect_id: sddd } } });

  response.send(alldata);
});

app.post("/razorpay", async (req, res) => {
  const { totalamount } = req.body;

  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
  });

  const payment_capture = 1;
  const amount = totalamount;
  const currency = "INR";

  const options = {
    amount: amount * 100,
    currency,
    receipt: shortid.generate(),
    payment_capture,
  };
  try {
    const response = await instance.orders.create(options);
    console.log(response);
    res.json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/filter", async function (request, response) {
  const alldata = await client
    .db("rentalshop")
    .collection("pageitems")
    .find(request.query)
    .toArray();
  // console.log(request.query);
  response.send(alldata);
});

app.get("/user/:id", async function (request, response) {
  const { id } = request.params;

  const alldata = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .findOne({ usertoken: id });
  console.log(alldata);
  response.send(alldata);
});

app.get("/user/post/items/:id", async function (request, response) {
  const { id } = request.params;

  const alldata = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .findOne({ usertoken: id }, { _id: 0, post: 1 });
  // console.log(alldata);
  response.send(alldata);
});

app.post("/post", async function (request, response) {
  const ddd = request.body;
  const postdata2 = await client
    .db("rentalshop")
    .collection("pageitems")
    .insertOne(ddd);

  response.send(postdata2);
});
app.delete("/pageitem/deleteitem/:id", async function (request, response) {
  const { id } = request.params;
  const item = await client
    .db("rentalshop")
    .collection("pageitems")
    .deleteOne({ prodect_id: id });
  response.send(item);
  console.log(id);
  console.log(item);
});
app.put("/useritem/delete/:id/:user_id", async function (request, response) {
  const { id, user_id } = request.params;
  const item = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .updateOne({ usertoken: user_id }, { $pull: { post: { prodect_id: id } } });
  // console.log(item )

  response.send(item);
});
app.put("/user/updateprofile/:user_id", async function (request, response) {
  const { id, user_id } = request.params;
  const data =  request.body
  const item = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .updateOne({ usertoken: user_id }, { $set: { name:data.name, dp : data.dp, bio:data.bio } });
  response.send(item);
});
app.put("/userOrder/delete/:id/:user_id", async function (request, response) {
  const { id, user_id } = request.params;
  const item = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .updateOne(
      { usertoken: user_id },
      { $pull: { rentalOrder: { prodect_id: id } } }
    );
  // console.log(item )
  response.send(item);
});
app.put("/post/user/item/:id", async function (request, response) {
  const ddd = request.body;
  const { id } = request.params;
  const productid = jwt.sign({ name: ddd.Name }, process.env.SECRET_KEY);
  const postdata = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .updateOne({ usertoken: id }, { $push: { post: ddd  } });
  response.send(postdata);
});
app.put("/order/user/item/:id/:productid", async function (request, response) {
  const ddd = request.body;
  const { id, productid } = request.params;
  const orderCheck = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .findOne({ usertoken: id, "rentalOrder.prodect_id": productid });

  const orderprofileCheck = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .findOne({ usertoken: id, "post.prodect_id": productid });
  if (orderCheck) {
    response.status(400).send("Order is already registered");
  } else {
    if (orderprofileCheck) {
      response.status(406).send("Order is already registered");
    } else {
      const orderdata = await client
        .db("rentalshop")
        .collection("rendal_shop_user")
        .updateOne({ usertoken: id }, { $push: { rentalOrder: ddd } });
      response.send(orderdata);
    }
  }

  console.log(orderCheck);
});

app.post("/user/signup", async function (request, response) {
  const { name, password, post, rentalOrder } = request.body;
  const userCheck = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .findOne({ name: name });
  if (userCheck) {
    response.status(400).send({ message: "username already exists" });
  } else if (password.length < 8) {
    response
      .status(400)
      .send({ message: "password must be at least 8 characters" });
  } else {
    const password_hash = await generateHashedpassword(password);
    const usertoken2 = jwt.sign({ name: name }, process.env.SECRET_KEY);
    const da = {
      name: name,
      password: password_hash,
      usertoken: usertoken2,
      post: post,
      rentalOrder: rentalOrder,
    };
    const adduser = await client
      .db("rentalshop")
      .collection("rendal_shop_user")
      .insertOne(da);
    const userCheck2 = await client
      .db("rentalshop")
      .collection("rendal_shop_user")
      .findOne({ name: name });
    const token = jwt.sign({ id: userCheck2._id }, process.env.SECRET_KEY);
    // console.log("token: " + token);
    response.send({ user_id: userCheck2.usertoken, token: token });
  }
});
app.post("/user/login", async function (request, response) {
  const { name, password } = request.body;
  const userCheck = await client
    .db("rentalshop")
    .collection("rendal_shop_user")
    .findOne({ name: name });
  if (!userCheck) {
    response.status(400).send({ message: "invalid credentials" });
  } else {
    const comparepassword = await bcrypt.compare(password, userCheck.password);
    if (comparepassword) {
      const token = jwt.sign({ id: userCheck._id }, process.env.SECRET_KEY);
      // console.log("token: " + token);
      response.send({ user_id: userCheck.usertoken, token: token });
    } else {
      response.status(400).send({ message: "invalid credentials" });
    }
  }
});

app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));
