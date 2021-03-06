var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var Mongoose = require('mongoose');
const Schema = Mongoose.Schema;
var bcrypt = require('bcryptjs');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var {body, validationResult} = require('express-validator');
var async =  require('async');


//require in DOTENV document
require('dotenv').config();
console.log("Eu sou o DB" + process.env.DB_LINK);
console.log("Eu sou o Passsword" + process.env.Password_Admin);
//conectio with DB
const mongoDb = process.env.DB_LINK;
Mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = Mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));
// This section Of code is for Models
const User = Mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    isAdmin: {type: Boolean, required: true, default: false},
    isMember: {type: Boolean, required: true, default: false}
  })
);
const Publication = Mongoose.model(
  'Publication',
  new Schema({
    title: {type: String, required:true},
    content: { type: String, required: true},
    user: {type: Schema.Types.ObjectId, ref: 'User', required:true}
  })
);
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({secret: 'cats', resave: false, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

passport.use(
  new LocalStrategy((username, password, done) => {
    User.findOne({ username: username }, (err, user) => {
      if (err) { 
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          // passwords match! log user in
          return done(null, user)
        } else {
          // passwords do not match!
          return done(null, false, { message: "Incorrect password" })
        }
      })
      return done(null, user);
    });
  })
);
app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

app.get('/', function(req, res, next) {
  Publication.find({}).sort({title: 1}).populate('user').exec(function(err, result){
    if(err){return next(err);}
    res.render('index', { title: 'Home', user: req.user, list_Publication: result});
  })
  
});
app.use('/users', usersRouter);
app.get('/sign-up', (req, res) => {
  const errors = validationResult(req)
  res.render('sign-up-form', {title: "Sign Up", user: req.user, errors: errors.array()})
});
app.post("/sign-up", (req, res, next) => {
  bcrypt.hash(req.body.password, 10, (err, hashedPassword)=>{
    const user = new User({
      username: req.body.username,
      password: hashedPassword
    }).save(err => {
      if (err) { 
        return next(err);
      }
      res.redirect("/");
    });
  })
});
app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/"
  })
);
app.get('/create-post', (req, res, next) => {
  const errors = validationResult(req);
  res.render('create-post', {title: "Create Post", user: req.user, errors: errors.array(), publication: Publication});
})
app.post('/create-post', [
  body('title', 'Title must not be empty.').trim().isLength({min: 1}).escape(),
  body('content', 'Content must not be empty.').trim().isLength({min: 1}).escape(),
  
  (req, res, next) =>{
    const errors = validationResult(req);
    var publication = new Publication(
      {
        title:req.body.title,
        content: req.body.content,
        user: req.body.userID
      }
    ); 
    if(!errors.isEmpty()){
      res.render('create-post', {title: 'Create Post', publication:publication, errors: errors.array(), user:req.user})
      return;
    }
    else{
      publication.save(function(err){
        if(err){return next(err);}
        res.redirect('/');
      })
    }
  }
]);
app.get('/be-member', (req, res, next) => {
  const errors = validationResult(req);
  res.render('be-member', {title: 'Be Member', user: req.user, errors: errors.array()})
});
app.post('/be-member', [
  body('codeVIP', 'You need to write Something').trim().isLength({min:1}).escape(),
  (req, res, next) =>{
    const errors = validationResult(req);
    if(req.user.isMember == false){
      if(req.body.codeVIP == process.env.Password_Member){
        User.findByIdAndUpdate(req.user._id, {isMember: true},function(err, result){
          if(err){return next(err);}
          else if(!errors.isEmpty()){
            res.render('be-member', {title: 'Be Member', user: req.user, errors: errors.array()})
          }
          else{
            res.redirect('/');
          }
        });
      }else{
        res.render('be-member', {title: 'Be Member', user: req.user, errors: errors.array()})
      }
    }
  }
]);
app.get('/be-admin', (req, res, next)=>{
  const errors = validationResult(req);
  res.render('be-admin', {user: req.user, title:'Be Admin', errors: errors.array()});
})
app.post('/be-admin', [
  body('codeAdmin', 'You need to write Something').trim().isLength({min:1}).escape(),
  (req, res, next) =>{
    const errors = validationResult(req);
    if(req.user.isAdmin == false){
      if(req.body.codeAdmin == process.env.Password_Admin){
        User.findByIdAndUpdate(req.user._id, {isAdmin: true},function(err, result){
          if(err){return next(err);}
          else if(!errors.isEmpty()){
            res.render('be-admin', {title: 'Be Admin', user: req.user, errors: errors.array()})
          }
          else{
            res.redirect('/');
          }
        });
      }else{
        res.render('be-admin', {title: 'Be Admin', user: req.user, errors: errors.array()})
      }
    }
  }
]);
app.post('/log-out-member', (req, res, next)=>{
  if(req.user.isMember == true){
    User.findByIdAndUpdate(req.user._id, {isMember: false},function(err, result){
      if(err){return next(err);}
      res.redirect('/');
    });
  }
});
app.post('/log-out-admin', (req, res, next)=>{
  if(req.user.isAdmin == true){
    User.findByIdAndUpdate(req.user._id, {isAdmin: false},function(err, result){
      if(err){return next(err);}
      res.redirect('/');
    });
  }
})
app.get('/delete/:id', (req, res, next) =>{
  const errors = validationResult(req);
  if(req.user.isAdmin == false){
    res.redirect('/be-admin');
  }else{
    Publication.findById(req.params.id).populate('user').exec(function(err, publication){
      if(err){return next(err);}
      if(publication == null){
        res.redirect('/');
      }
      res.render('delete-post', {title: 'Delete Publication', user: req.user, errors: errors.array(), publication:publication})
    });
    
  }
})
app.post('/delete/:id', (req, res, next)=>{
  if(req.user.isAdmin==false){
    res.redirect('/');
  }else{
    Publication.findByIdAndRemove(req.body.postID, function deletePost(err){
      if(err){next(err);}
      res.redirect('/')
    })
  }
})
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
app.get("/log-out", (req, res) => {
  if(req.user.isMember == true){
    User.findByIdAndUpdate(req.user._id, {isMember: false},function(err, result){
      if(err){return next(err);}
    });
  }
  if(req.user.isAdmin == true){
    User.findByIdAndUpdate(req.user._id, {isAdmin: false},function(err, result){
      if(err){return next(err);}
    });
  }
  req.logout();
  res.redirect("/");
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
