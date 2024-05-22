const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const itemSchema = {
    name: String,
    price: Number,
    img: String,
    categeory: String,
    discreption: String
  };

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;