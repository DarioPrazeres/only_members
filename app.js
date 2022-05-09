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
console.log(process.env.FOO);
if(process.env.NODE_ENV !== 'production'){
  require('dotenv').config();
}
console.log(process.env.FOO);
console.log(process.env.DB_LINK);//"mongodb+srv://m001-student:m001-mongodb-basics@cluster0.0cgbl.mongodb.net/user?retryWrites=true&w=majority"
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
    password: { type: String, required: true }
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
  Publication.find({}).sort({title: 1}).exec(function(err, result){
    if(err){return next(err);}
    res.render('index', { title: 'Home', user: req.user, list_Publication: result});
  })
  
});
app.use('/users', usersRouter);
app.get('/sign-up', (req, res) => {
  res.render('sign-up-form')
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
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
app.get("/log-out", (req, res) => {
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
