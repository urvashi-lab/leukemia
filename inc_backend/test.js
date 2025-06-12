const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testFlaskEndpoints() {
  try {
    console.log("Testing Flask server is running...");
    // Skip the root test since it's not implemented
    
    // Test the /predict endpoint with a minimal request
    console.log("Testing Flask predict endpoint...");
    const testImagePath = "D:\\projects\\inc_backend\\Snap_015.jpg" // Update this path
    
    // Check if the test image exists
    if (!fs.existsSync(testImagePath)) {
      console.error("Test image not found at:", testImagePath);
      console.log("Please update the testImagePath variable with a valid image path");
      return;
    }
    
    const predForm = new FormData();
    predForm.append("image", fs.createReadStream(testImagePath));
    
    console.log("Sending request to Flask prediction API...");
    const predictResponse = await axios.post("http://127.0.0.1:5000/predict", predForm, {
      headers: predForm.getHeaders(),
      timeout: 15000 // 15 second timeout
    });
    
    console.log("Predict endpoint working:", predictResponse.data);
    
    // Test the /generate endpoint
    console.log("Testing Flask generate endpoint...");
    const genForm = new FormData();
    genForm.append("file", fs.createReadStream(testImagePath));
    
    console.log("Sending request to Flask Grad-CAM API...");
    const generateResponse = await axios.post("http://127.0.0.1:5000/generate", genForm, {
      headers: genForm.getHeaders(),
      timeout: 15000 // 15 second timeout
    });
    
    console.log("Generate endpoint working:", generateResponse.data);
    
  } catch (error) {
    console.error("Flask server test failed:");
    console.error("Error message:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      console.error("No response received. Request details:", error.request._currentUrl);
      console.error("Server might be down or unreachable.");
    } else {
      console.error("Error setting up request:", error);
    }
  }
}

// Run the test
testFlaskEndpoints();