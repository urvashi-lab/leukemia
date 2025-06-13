const express = require("express");
require('dotenv').config();
const app = express();
const axios = require("axios");
const PORT = 3000;
const path = require("path");
const methodOverride = require("method-override");
const ejsMate=require("ejs-mate");
const mongoose = require('mongoose');
const User=require("D:\\projects\\project-repo\\inc_backend\\BloodNova\\models\\user.js");
const Report=require("D:\\projects\\project-repo\\inc_backend\\BloodNova\\models\\upload.js");
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const { exec } = require('child_process'); // Added for Flask API execution

const multer = require('multer');

const { v4: uuidv4 } = require('uuid'); 
// Define storage (e.g., memory or disk)
const storage = multer.memoryStorage(); // Stores file in memory as Buffer
const upload = multer({ storage: storage }); // Create upload middleware

// Start Flask API server for chatbot
const pythonExec = "D:\\projects\\project-repo\\pincone\\venv\\Scripts\\python.exe"; // Path to Python in virtual env
console.log("Starting Flask API server for chatbot...");
const flaskProcess = exec(`${pythonExec} D:\\projects\\project-repo\\pincone\\query.py`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error starting Flask server: ${stderr}`);
    // Continue with Express server even if Flask fails
  }
});

// Log Flask server output
flaskProcess.stdout?.on('data', (data) => {
  console.log(`Flask: ${data}`);
});

flaskProcess.stderr?.on('data', (data) => {
  console.error(`Flask error: ${data}`);
});

// Make sure Flask server is terminated when Express server exits
process.on('exit', () => {
  flaskProcess.kill();
});

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

const sessionOptions = {
    secret: process.env.SECRET ,
    resave: false,
    saveUninitialized: true
};

app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;  // 👈 Makes current user available in all views
    next();
});

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")))

app.get("/",(req,res)=>{
    // res.send("Working");
    res.render("everythingelse/index.ejs",{page:"home"});
})

app.get("/login",(req,res)=>{
    res.render("everythingelse/login.ejs",{page:"login"});
})
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    // req.flash("error", "You must be logged in to view this page.");
    res.redirect("/login");
}




app.get('/account', isLoggedIn, async (req, res) => {
    try {
        // Get the current logged in user
        const user = await User.findById(req.user._id);
        
        // Get all reports created by this doctor/user
        const reports = await Report.find({ doctor: req.user._id })
            .sort({ createdAt: -1 }); // Sort by most recent first
        
        // Render the account page with user and reports data
        res.render("everythingelse/account.ejs", {
            page: "account",
            user: user,
            reports: reports
        });
        
    } catch (error) {
        console.error('Error loading account page:', error);
        res.redirect('/');
    }
});

// Route to view a specific report
app.get('/reports/:id', isLoggedIn, async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        
        // Check if report exists and belongs to the logged in user
        if (!report || report.doctor.toString() !== req.user._id.toString()) {
           
            return res.redirect('/account');
        }
        
        // Set headers for inline PDF viewing
        res.set({
            'Content-Type': report.reportFile.contentType,
            'Content-Disposition': 'inline; filename="' + report.patientName.replace(/\s+/g, '_') + '_report.pdf"'
        });
        
        // Send the PDF data to be displayed in the browser
        res.send(report.reportFile.data);
    } catch (error) {
        console.error('Error viewing report:', error);
        
        res.redirect('/account');
    }
});

const loginVerificationMiddleware = (req, res, next) => {
    // Simple check if user is logged in by looking for req.user._id
    if (!req.user || !req.user._id) {
      // User is not logged in, redirect to login page
      return res.redirect('/login?redirect=' + req.originalUrl);
    }
    
    // User is logged in, proceed to the next middleware or route handler
    next();
};

app.get("/upload",loginVerificationMiddleware,(req,res)=>{
    res.render("everythingelse/upload.ejs",{page:"upload"});
})

app.get("/signup",(req,res)=>{
    res.render("everythingelse/signup.ejs",{page:"signup"});
})

app.get("/about",(req,res)=>{
    res.render("everythingelse/learnmore.ejs",{page:"other"});
})

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
   
}), (req, res) => {
    
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        
        res.redirect('/');
    });
});

app.post('/signup', async (req, res) => {
    let {username,name,email,password,phoneNumber}=req.body;
    const newUser=new User({
        name,
        username,
        email,
        phoneNumber
    });
    let registeredUser=await User.register(newUser,password);
    console.log(registeredUser)
    req.login(registeredUser,(err)=>{
        if(err){
          return next(err);
        }

        res.redirect("/");
        })
});

// 🟢 Upload Blood Smear Image (Middleware for file validation)
app.post('/upload', upload.single('file'), async (req, res, next) => {
    try { const patientId = "PAT-" + uuidv4();
        const report = new Report({
            doctor: req.user._id, // Logged-in doctor's ID
            patientId,
            patientName: req.body.patientName,
            patientAge: req.body.patientAge,
            patientGender: req.body.patientGender,
            bloodGroup: req.body.bloodGroup,
            phoneNumber: req.body.phoneNumber,
            bloodSmearImage: {
                data: req.file.buffer,
                contentType: req.file.mimetype
            }
        });
        
        const savedreport= await report.save();
        console.log("Sending request to model server with patientId:", savedreport._id);

        // 🔵 Send image ID to Model Server
        await axios.post('http://localhost:8000/generate-report', { patientId: savedreport.patientId });
        console.log("Sent request to model server with patientId:", savedreport._id);

        console.log("⏳ Waiting for the report to be saved in the database...");
        let pdfReport = null;

        for (let attempts = 0; attempts < 10; attempts++) { // Retry mechanism
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retrying
            pdfReport = await Report.findOne({ patientId: savedreport.patientId });

            if (pdfReport && pdfReport.reportFile && pdfReport.reportFile.data) {
                console.log("✅ PDF found in database!");
                break;
            }
        }

        if (!pdfReport || !pdfReport.reportFile || !pdfReport.reportFile.data) {
            return res.status(404).json({ message: 'PDF report not available yet. Try again later.' });
        }

        // 🔹 Set headers to open PDF in a new tab
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="patient-report-${savedreport.patientId}.pdf"`
        });

        // 🔹 Send the PDF file directly in response
        res.send(pdfReport.reportFile.data);
    } catch (error) {
        next(error); // Pass to error handler
    }
});

app.get('/patient-report/:patientId', async (req, res, next) => {
    try {
        const patientId = req.params.patientId;
        
        // Find the report document
        const report = await Report.findOne({ patientId: patientId });
        
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        
        // Check if the report has a PDF file
        if (!report.reportFile || !report.reportFile.data) {
            return res.status(404).json({ 
                message: 'PDF report not yet available', 
                status: 'processing' 
            });
        }
        
        // Set the appropriate headers for PDF
        res.set({
            'Content-Type': 'application/pdf',
'Content-Disposition': `inline; filename="patient-report-${patientId}.pdf"`
        });
        
        // Send the PDF buffer data as the response
        res.send(report.reportFile.data);
        
    } catch (error) {
        console.error('Error retrieving PDF:', error);
        next(error);
    }
});
app.post('/api/chatbot', async (req, res) => {
    try {
        // Forward the user message to the Flask API
        const response = await axios.post('http://localhost:4000/api/chat', {
            message: req.body.message
        });
        
        // Return the response from Flask
        res.json(response.data);
    } catch (error) {
        console.error('Error forwarding to chatbot API:', error);
        res.status(500).json({ 
            response: "Sorry, the chatbot service is currently unavailable. Please try again later."
        });
    }
});
app.get('/api/chatbot/initialize', async (req, res) => {
    try {
        // Forward the initialization request to Flask API
        const response = await axios.get('http://localhost:4000/api/initialize');
        res.json(response.data);
    } catch (error) {
        console.error('Error initializing chatbot:', error);
        res.status(500).json({
            status: "error",
            message: "Failed to initialize chatbot",
            system_message: "Welcome! How can I help you today?"
        });
    }
});

// 🟢 Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message || 'Something went wrong' });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
