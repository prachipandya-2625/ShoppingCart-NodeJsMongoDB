const crypto = require('crypto');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');

const transpoter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: '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'
    }
}));

exports.getLogin = (req, res, next) => {

    let message = req.flash('error');
    if (message.length > 0)
        message = message[0]
    else
        message = null
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput : {
            email : '',
            password : ''
        },
        validationErrors : []
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const error = validationResult(req);
    console.log(error);
    // console.log(error.errors[0].msg);
    if (!error.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'login',
            errorMessage: error.errors[0].msg,
            oldInput : {
                email : email,
                password : password
            },
            validationErrors : error.errors
        });
    }
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'login',
                    errorMessage: 'Invalid email or password.',
                    oldInput : {
                        email : email,
                        password : password
                    },
                    validationErrors : [{'param' : 'email' , 'param' : 'password'}]
                });
            }
            bcrypt.compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save((err) => {
                            res.redirect('/');
                        })
                    }
                   // req.flash('error', 'Invalid email or password.');
                    return res.status(422).render('auth/login', {
                        path: '/login',
                        pageTitle: 'login',
                        errorMessage: 'Invalid email or password.',
                        oldInput : {
                            email : email,
                            password : password
                        },
                        validationErrors : [{'param' : 'email' , 'param' : 'password'}]
                    });
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login');
                });


        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          })
      
};
exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0)
        message = message[0]
    else
        message = null
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput : {
            email : '',
            password : '',
            confirmPassword : ''
        },
        validationErrors : []
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const error = validationResult(req);
    // console.log(error.errors);
    if (!error.isEmpty()) {
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: error.errors[0].msg,
            oldInput : {
                email : email,
                password : password,
                confirmPassword : req.body.confirmPassword
            },
            validationErrors : error.errors
        });
    }
    return bcrypt.hash(password, 12)
        .then(hashedpassword => {
            const user = new User({
                email: email,
                password: hashedpassword,
                cart: { items: [] }
            });
            return user.save();
        })
        .then(result => {
            res.redirect('/login');
            return transpoter.sendMail({
                to: email,
                from: 'prachipandya999@gmail.com',
                subject: 'Signup Succeeded!!!',
                html: '<h1>You successfully signed up!</h1>'
            });

        }).catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          })
      

};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0)
        message = message[0]
    else
        message = null
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email }).
            then(user => {
                if (!user) {
                    req.flash('error', 'No account found with that email address');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            }).then(result => {
                res.redirect('/');
                transpoter.sendMail({
                    to: req.body.email,
                    from: 'prachipandya999@gmail.com',
                    subject: 'Password Reset',
                    html: `
                <p>You requested a password reset</p>
                <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password</p>
                `
                });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
              })
          
    })
}
exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
        resetToken: token,
        resetTokenExpiration: { $gt: Date.now() }
    }).then(user => {
        let message = req.flash('error');
        if (message.length > 0)
            message = message[0]
        else
            message = null
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            errorMessage: message,
            userId: user._id.toString(),
            passwordToken: token
        });
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      })  

}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetuser;

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId
    }).then(user => {
        resetuser = user;
        return bcrypt.hash(newPassword, 12);
    })
        .then(hashedpassword => {
            resetuser.password = hashedpassword;
            resetuser.resetToken = undefined;
            resetuser.resetTokenExpiration = undefined;
            return resetuser.save();
        })
        .then(result => {
            res.redirect('/login');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          })      
}