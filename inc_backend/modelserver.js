const express = require("express");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");
const { exec } = require("child_process");
const mongoose = require('mongoose');
const User=require("D:\\projects\\project-repo\\inc_backend\\BloodNova\\models\\user.js");
const Report=require("D:\\projects\\project-repo\\inc_backend\\BloodNova\\models\\upload.js");
const cors = require('cors');





const app = express();
app.use(express.json());
app.use(cors());
mongoose.connect('mongokey', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000, // Increase timeout
    connectTimeoutMS: 15000 // Increase connection timeout
  })
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

  const { MongoClient, ObjectId } = require('mongodb');
  async function findPatient(patientId) {
    const uri = "mongokey";
    const client = new MongoClient(uri);
    
    try {
      await client.connect();
      const database = client.db("BloodNova");
      const collection = database.collection("reports");
      
      const query = { patientId: patientId };
      const patient = await collection.findOne(query);
      
      return patient;
    } finally {
      await client.close();
    }
  }

  
  

  async function findDoctor(patientId) {
    const uri = "mongokey";
    const client = new MongoClient(uri);

    try {
        console.log(`Finding doctor for patient ID: ${patientId}`);
        await client.connect();
        console.log("Connected to MongoDB in findDoctor function");
        
        const database = client.db("BloodNova");

        // Step 1: Retrieve patient details
        const patientsCollection = database.collection("reports");
        const patientQuery = { patientId: patientId };
        console.log("Looking for patient with query:", patientQuery);
        
        const patient = await patientsCollection.findOne(patientQuery);
        console.log("Patient found:", patient ? "Yes" : "No");
        
        if (!patient) {
            console.log("No patient found with this ID");
            return null;
        }
        
        if (!patient.doctor) {
            console.log("Patient found but no doctor field present");
            return null;
        }
        
        console.log("Doctor ID from patient record:", patient.doctor);
        
        // Check if doctor ID is in the correct format
        let doctorId;
        try {
            doctorId = new ObjectId(patient.doctor);
            console.log("Successfully created ObjectId from doctor ID");
        } catch (error) {
            console.error("Error creating ObjectId:", error.message);
            // If doctor is not an ObjectId string, try different approaches
            if (typeof patient.doctor === 'object' && patient.doctor._id) {
                doctorId = patient.doctor._id;
                console.log("Using doctor._id instead");
            } else {
                console.log("Doctor ID is in an invalid format:", patient.doctor);
                return null;
            }
        }

        // Step 2: Retrieve doctor details
        const doctorsCollection = database.collection("users");
        const doctorQuery = { _id: doctorId };
        console.log("Looking for doctor with query:", JSON.stringify(doctorQuery));
        
        const doctor = await doctorsCollection.findOne(doctorQuery);
        console.log("Doctor found:", doctor ? "Yes" : "No");
        
        if (doctor) {
            console.log("Doctor details:", JSON.stringify(doctor));
        } else {
            console.log("No doctor found with ID:", patient.doctor);
        }

        return doctor;
    } catch (error) {
        console.error("Error in findDoctor function:", error);
        return null;
    } finally {
        await client.close();
        console.log("MongoDB connection closed in findDoctor");
    }
}

async function savePdfToDatabase(patientId, pdfFileName) {
    try {
      // Path to the PDF file in your current working directory
      const pdfPath = path.join(process.cwd(), pdfFileName);
      console.log(pdfPath);
      
      // Read the file into a buffer
      const pdfBuffer = fs.readFileSync(pdfPath);
      
      // Get the patient object
      const patient = await findPatient(patientId);
      
      // Access the MongoDB collection directly
      const db = mongoose.connection.db; // Assuming mongoose connection is established
      const patientsCollection = db.collection('reports'); // Replace with your actual collection name
      
      // Update the patient document
      const result = await patientsCollection.updateOne(
        { _id: new mongoose.Types.ObjectId(patient._id) }, // Convert string ID to ObjectId if needed
        { $set: { reportFile: { data: pdfBuffer, contentType: "application/pdf" } } }
      );
      
      if (result.modifiedCount === 0) {
        throw new Error("Failed to update report in database");
      }
      
      console.log("PDF saved to database successfully");
      
      return {
        success: true,
        message: "Report saved to database successfully",
        patientId: patient._id,
      };
      
    } catch (error) {
      console.error("Error saving PDF to database:", error);
      throw error;
    }
  }
  

// API to generate report
app.post("/generate-report", async (req, res) => {
    try {
        const { patientId } = req.body;
        console.log(`Processing report for patient ID: ${patientId}`);
        const patient = await findPatient(patientId);
        
        
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        const doctor = await findDoctor(patientId);
        
        // Create database object
        const DATABASE = {
            doctor: doctor
                ? {
                      name: doctor.name || "Unknown",
                      specialty: doctor.specialty || "General Practitioner",
                      phone: doctor.phoneNumber || "N/A",
                      hospital: doctor.hospital || "Deenanath Mangeshkar Hospital"
                  }
                : {
                      name: "Unknown",
                      specialty: "Unknown",
                      phone: "N/A",
                      hospital: "Unknown Hospital"
                  },
            patient: {  
                name: patient.patientName,
                id: patient.patientId,
                age: patient.patientAge,
                gender: patient.patientGender,
                bloodGroup: patient.bloodGroup,
                phone: patient.phoneNumber,
                referringPhysician: patient.referringPhysician || "Dr. Sanjeev Joshi"
            }
        };
        
        // Handle image data properly
        let tempFilePath = null;
        
        if (patient.bloodSmearImage && patient.bloodSmearImage.data) {
            console.log("Patient has blood smear image data");
            
            // Convert MongoDB Binary to Buffer
            let imageBuffer;
            if (patient.bloodSmearImage.data instanceof Buffer) {
                imageBuffer = patient.bloodSmearImage.data;
            } else {
                // Handle BSON Binary type
                imageBuffer = Buffer.from(patient.bloodSmearImage.data.buffer);
            }
            
            // Create a temporary file from the buffer
            tempFilePath = path.join(__dirname, `temp_image_${patientId}.png`);
            fs.writeFileSync(tempFilePath, imageBuffer);
            DATABASE.imagePath = tempFilePath;
        } else if (patient.bloodSmearPath) {
            console.log("Using blood smear path");
            // Use the stored path if available
            DATABASE.imagePath = patient.bloodSmearPath;
        } else {
            console.log("No image available for this patient");
            return res.status(400).json({ error: "No image available for this patient" });
        }
        
        console.log(`Image path: ${DATABASE.imagePath}`);
        
        // Now we can safely create a read stream
        const imageStream = fs.createReadStream(DATABASE.imagePath);
        const form = new FormData();
        form.append("file", imageStream);

        // Send image to Flask's Grad-CAM API
        console.log("Sending request to Flask Grad-CAM API");
        const flaskResponse = await axios.post("http://127.0.0.1:5000/generate", form, {
            headers: form.getHeaders(),
        });
        console.log("Received response from Flask Grad-CAM API");

        // Send image to Flask for prediction
        console.log("Sending request to Flask prediction API");
        const predForm = new FormData();
        predForm.append("image", fs.createReadStream(DATABASE.imagePath));
        const predictionResponse = await axios.post("http://127.0.0.1:5000/predict", predForm, {
            headers: predForm.getHeaders(),
        });
        console.log("Received response from Flask prediction API");

        // Prepare response
        const result = {
            doctor: DATABASE.doctor,
            patient: DATABASE.patient,
            prediction: predictionResponse.data.prediction,
            confidence : predictionResponse.data.confidence,
            grad_cam: flaskResponse.data.grad_cam,
            abnormal_regions: flaskResponse.data.abnormal_regions,
            grad_cam_colored: flaskResponse.data.grad_cam_colored
        };

        // Save the result as JSON for `generate_report.py`
        const jsonPath = path.join(__dirname, "report_data.json");
        fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
        console.log("Saved report data to JSON");

        // Path to Python inside your virtual environment
        const pythonExec = "D:\\projects\\project-repo\\inc_backend\\venv\\Scripts\\python.exe";   // Windows
        
        // Run Python script using venv
        console.log("Executing Python report generation script");
        exec(`${pythonExec} generate_report.py`, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Error generating report: ${stderr}`);
                return res.status(500).json({ error: "Report generation failed" });
            }
            console.log(stdout);
            
            // Clean up temporary file if created
            if (tempFilePath) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (unlinkError) {
                    console.error("Failed to delete temporary file:", unlinkError);
                }
            }
            
            // res.json({ message: "Report generated successfully", file: "ALL_Detection_Report.pdf" });
            
            // savePdfToDatabase(patientId, "ALL_Detection_Report.pdf");
            try {
                // Save PDF to database - now properly awaited
                const saveResult = await savePdfToDatabase(patientId, "ALL_Detection_Report.pdf");
                
                // Only send response after everything is complete
                res.json({ 
                    message: "Report generated and saved successfully", 
                    file: "ALL_Detection_Report.pdf",
                    reportId: saveResult.reportId
                });
            } catch (saveError) {
                console.error("Error saving PDF:", saveError);
                res.status(500).json({ 
                    error: "Report was generated but could not be saved to database",
                    details: saveError.message
                });
            }
        });
        
    } catch (error) {
        console.error("Error in generate-report:", error);
        res.status(500).json({ error: error.message || "Something went wrong" });
    }
});







app.listen(8000, () => console.log("Express server running on port 8000"));


