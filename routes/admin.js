const path = require('path');

const express = require('express');

const adminController = require('../controllers/admin');

const router = express.Router();

const isAuth = require('../middleware/is-auth');
const { body } = require('express-validator/check');

// /admin/add-product => GET
router.get('/add-product',isAuth, adminController.getAddProduct);

// // /admin/products => GET
router.get('/products',isAuth,adminController.getProducts);

// /admin/add-product => POST
 router.post('/add-product',[
     body('title').isString().isLength({min:3}).trim().withMessage('title'),
     body('price').isFloat().withMessage('price'),
     body('descritpion').isLength({min : 5 , max : 400}).withMessage('desc')

 ] ,isAuth,adminController.postAddProduct);

 router.get('/edit-product/:productId',isAuth ,adminController.getEditProduct);

 router.post('/edit-product',[
    body('title').isString().isLength({min:3}).trim(),
    body('price').isFloat().withMessage('price'),
    body('descritpion').isLength({min : 5 , max : 400}).trim()

],isAuth,adminController.postEditProduct);

 router.delete('/product/:productId',isAuth,adminController.deleteProduct);
module.exports = router;
