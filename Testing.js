//jshint esversion:6
// username and password only in plane text

const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const randomString = require("randomstring");
const nodemailer = require('nodemailer');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/users2DB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  secrettoken: String,
  active: Boolean
});

const User = mongoose.model("User", userSchema);

app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});


app.get("/register", function(req, res){
  res.render("register");
});

app.get("/verify", function(req, res){
  res.render("verify");
});

app.get("/logout", function(req, res){
  res.redirect("/");
});

app.post("/verify", function(req, res){

//secret token entered in the input-text
  const secretToken = req.body.secrettoken;


  // Find the account that matches the secret token
  User.findOne({secrettoken: secretToken}, function(err, foundUser){
    if(err){
      console.log(err);
    }
    // try{    if(!foundUser){
    //       res.send("Are you sure you've entered the correct token?");
    //       // res.redirect("/");
    //       throw e;
    //     }
    //   }
    // catch(e){
    //   console.log(e);
    // }
    // finally{
    //   res.redirect("/verify");
    // }
    if(!foundUser){
      res.send("Are you sure you've entered the correct token?");
      // res.redirect("/");
    }
    foundUser.active = true;
    foundUser.secrettoken = ""; // These two lines mean user has been verified

    foundUser.save(function(err){ // Save the user into the database
      if(err){
        console.log(err);
      } else{
        res.redirect("/login");
      }
    });
  });

});

app.post("/register", function(req, res){
  User.findOne({email: req.body.username}, function(err, foundUser){  // checks if the user already exists in our Database or not
    if(err){
      console.log(err);
    }
    if(foundUser){  // If the user alreay exists in out Database
      if (foundUser.active === true) {     //  and verified
      res.send("User already exists please login");
    } else if(foundUser.active === false && req.body.password === foundUser.password){  //  but not verified and entered password is correct
      res.redirect("/verify");
    } else if(foundUser.active === false && req.body.password !== foundUser.password){  // but not verified and entered password is wrong
      res.send("Why wrong password?");
    } else{
        //Generate secret token
        const secretToken = randomString.generate({
          length: 6,
          charset: "numeric"
        });

      // Create new user with active: false after verification active will be true
      const newUser = new User({
        email: req.body.username,
        password: req.body.password,
        secrettoken: secretToken,
        active: false
      });
      newUser.save(function(err){     // Save the user and redirect them to verify route
        if(err){
          console.log(err);
        } else{
          res.redirect("/verify");
        }
      });

      //////////////////////////////// Email Verification ///////////////////////////////////////////
      const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
              user: 'nachiketadhal.99@gmail.com',
              pass: 'Nachi@123'
          }
      });

      const mailOptions = {
          from: 'admin',
          to: newUser.email,
          subject: 'Please verify your Email',
          html:`Thank you for registering!
          Please verify the email by typing the following token:
          <br>
          Token: <b>${secretToken}</b>
          <br>
          into the verify page.
          <br>
          Have a great Day!`
      };

      transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
              console.log(error);
          } else {
              console.log('Email sent: ' + info.response);
          }
      });
      ////////////////////////////////////////////////////////////////////////////////

    }
    }



  });

});

app.post("/login", function(req, res){
  const userName = req.body.username;
  const password = req.body.password;

  User.findOne({email: userName}, function(err, foundUser){   // Find if the user is in our database or not
    if(err){
      console.log(err);
    } else if(!foundUser){    // If the user is not found
      res.send("Please register");
    } else{
      if(foundUser){    // If the user is found
        if(foundUser.active === false && foundUser.password === password){   // Not verified, but entered correct password
          res.redirect("/verify");
        }
        if(foundUser.active === false && foundUser.password !== password){  // But neither verified nor typing correct password
          res.send("You have not verified yet and you are typing different password for login.")
        }
        if(foundUser.active === true && foundUser.password !== password){    // verified, but the password is wrong
          res.send("Wrong Password!");
        }
        if(foundUser.active === true && foundUser.password === password){    // Verified as well as entered the correct password
          res.render("secrets");
        }
      }
    }
  });
});



app.listen(3000, function(){
  console.log("Server started at port 3000");
});
