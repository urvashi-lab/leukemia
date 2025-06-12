const mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost:27017/blood_nova', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// })
// .then(() => console.log("MongoDB Connected"))
// .catch(err => console.error("MongoDB Connection Error:", err));
const passportLocalMongoose=require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: { // 🟢 Username field for login
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

// const newUser = new User({
//     name: "John Doe",
//     email: "johndoe@example.com",
//     password:"abc"
// });

// newUser.save()
//     .then(() => console.log("User saved successfully"))
//     .catch((err) => console.log("Error saving user:", err));



module.exports = User;
