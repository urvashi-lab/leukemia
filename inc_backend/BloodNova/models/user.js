const mongoose = require('mongoose');

const passportLocalMongoose=require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: { 
        type: String,
        required: true,
        unique: true
    },
    phoneNumber:{
        type: String,
        required: true
    }
    ,
    email: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.plugin(passportLocalMongoose);
const User = mongoose.model('User', userSchema);

module.exports = User;
