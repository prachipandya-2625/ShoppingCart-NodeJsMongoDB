const Product = require('../models/product');
const { validationResult } = require('express-validator/check');
const { ObjectId } = require('mongodb');
const fileHelper = require('../util/file');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};


exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const descritpion = req.body.descritpion;

  const error = validationResult(req);

  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        descritpion: descritpion
      },
      errorMessage: 'Attached file is not an image',
      validationErrors: []
    });
  }
  if (!error.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        imageUrl: imageUrl,
        price: price,
        descritpion: descritpion
      },
      errorMessage: error.errors[0].msg,
      validationErrors: error.errors
    });
  }
  // console.log('user = ' + req.user);
  const imageUrl = image.path;

  const product = new Product(
    {
      title: title,
      price: price,
      descritpion: descritpion,
      imageUrl: imageUrl,
      userId: req.user
    });
  product.save()
    .then(result => {
      // console.log(result);
      // console.log('Product created');
      res.redirect('/admin/products');
    }).catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    })

};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(product => {
      if (!product) {
        res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        hasError: false,
        product: product,
        errorMessage: null,
        validationErrors: []
      });
    }).catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedtitle = req.body.title;
  const image = req.file;
  const updatedprice = req.body.price;
  const updateddescritpion = req.body.descritpion;
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedtitle,
        price: updatedprice,
        descritpion: updateddescritpion,
        _id: prodId
      },
      errorMessage: error.errors[0].msg,
      validationErrors: error.errors
    });
  }
  Product.findById(prodId).then(product => {
    // if (product.userId !== req.user._id) {
    //   return res.redirect('/');
    // }
    if (image) {
      fileHelper.deleteFile(product.imageUrl);
      product.imageUrl = image.path;
    }
    product.title = updatedtitle;
    product.price = updatedprice;
    product.descritpion = updateddescritpion;
    return product.save().then(result => {
      res.redirect('/admin/products');
    })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      })

  })

};

exports.getProducts = (req, res, next) => {
  Product.find({
    userId: req.user._id
  })
    // .select('title price -_id')
    //   .populate('userId')
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      });
    }).catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    })

};

exports.deleteProduct = (req, res, next) => {
  const productId = req.params.productId;
  Product.findById(productId)
    .then(product => {
      if (!product) {
        return next(new Error('Product not found'));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.findByIdAndRemove(productId);
    })
    .then(() => {
      res.status(200).json({ message: 'Success' });
    })
    .catch(err => {
      res.status(500).json({ message: 'Deleting product failedF' });
    })

};