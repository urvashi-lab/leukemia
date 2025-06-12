

// mongoose.connect('mongodb://localhost:27017/blood_nova', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// })
// .then(() => console.log("MongoDB Connected"))
// .catch(err => console.error("MongoDB Connection Error:", err));

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Linking report to the doctor
        required: true
    },
    patientId: {
        type: String,
        required: true,
        unique: true // Ensures each patient has a unique ID
    },
    patientName: {
        type: String,
        required: true
    },
    patientAge: {
        type: Number,
        required: true
    },
    patientGender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true
    },
    bloodGroup: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    bloodSmearImage: {
        data: Buffer,
        contentType: String
    },
    reportFile: {
        data: Buffer, // Storing the generated PDF report as binary
        contentType: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Report = mongoose.model("Report", reportSchema);
module.exports = Report;

