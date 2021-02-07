const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
var cookieParser = require('cookie-parser');
var flash = require('connect-flash');
const multer = require('multer');


const errorController = require('./controllers/error');
const mongoose = require('mongoose');
const User = require('./models/user');

const fileStorage = multer.diskStorage({
  destination : (req,file,cb) => {
    cb(null,"images");
  },
  filename : (req,file,cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req,file,cb) => {
  if(file.mimetype === 'image/jpg'|| file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' )
  {
    cb(null,true);
  }else{
    cb(null,false);
  }
}
const csrfProtection = new csrf();
const MONGODB_URI = 'mongodb+srv://prachipandya26:mtm1OwspurCU4iED@cluster0.ixsll.mongodb.net/shop?retryWrites=true&w=majority';

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});



app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({storage : fileStorage , fileFilter : fileFilter}).single('image'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname, 'images')));

app.use(cookieParser('secret'));
app.use(
  session(
    {
      secret: 'my secret',
      resave: false,
      saveUninitialized: false,
      store: store
      //cookie: { maxAge: 60000 }
    })
);
app.use(csrfProtection);
app.use(flash());


app.use((req, res, next) => {
  if(!req.session.user)
  {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if(!user)
      {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      //console.log(err)
     next(new Error(err));
    });

});

app.use((req,res,next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
})
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500',errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  res.redirect('/500');
  // res.status(500).render('500',
  // {
  //   pageTitle: 'Error!',
  //   path: '/500'
    
  // });
});
mongoose.connect(MONGODB_URI)
  .then(result => {
    app.listen(3000, () => {
      console.log('connected');
    });

  }).catch(err => {
    console.log(err);
  })


