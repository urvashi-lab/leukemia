from flask import Flask, request, jsonify, send_file
import tensorflow as tf
import numpy as np
import cv2
import os
from PIL import Image
from tensorflow.keras.preprocessing import image


# Ensure static folder exists
os.makedirs("static", exist_ok=True)


# Define class labels
CLASS_LABELS = ["EarlyPreB", "PreB", "ProB", "benign"]


# Load the trained model
model = tf.keras.models.load_model("leukemia_model.keras", compile=False)


# Initialize Flask app
app = Flask(__name__)


# Function to generate Grad-CAM visualizations
def generate_visualizations(img_path):
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img) / 255.0  # Normalize
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    img_tensor = tf.Variable(img_array, dtype=tf.float32)


    # Identify last conv layer
    last_conv_layer = model.get_layer("top_conv")  # Adjust layer name if needed


    # Create Grad-CAM model
    grad_model = tf.keras.models.Model(
        inputs=model.input, outputs=[last_conv_layer.output, model.output]
    )


    # Compute Grad-CAM
    with tf.GradientTape() as tape:
        conv_output, predictions = grad_model(img_tensor)
        class_idx = tf.argmax(predictions[0]).numpy()
        class_output = predictions[:, class_idx]


    grads = tape.gradient(class_output, conv_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))


    # Weight activations
    heatmap = tf.reduce_sum(pooled_grads * conv_output, axis=-1)[0]
    heatmap = np.maximum(heatmap, 0)
    heatmap /= np.max(heatmap)
    heatmap = cv2.resize(heatmap, (224, 224))


    # Convert heatmap to OpenCV format
    heatmap_cv = np.uint8(255 * heatmap)


    # Apply Otsu thresholding
    _, thresholded_map = cv2.threshold(heatmap_cv, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresholded_map_colored = cv2.cvtColor(thresholded_map, cv2.COLOR_GRAY2BGR)


    # Overlay on original image
    original_img = cv2.imread(img_path)
    original_img = cv2.resize(original_img, (224, 224))
    overlay = cv2.addWeighted(original_img, 0.7, thresholded_map_colored, 0.3, 0)


    # Generate colored heatmap
    heatmap_colored = cv2.applyColorMap(heatmap_cv, cv2.COLORMAP_JET)


    # Save images
    heatmap_path = "static/grad_cam.png"
    overlay_path = "static/abnormal_regions.png"
    heatmap_colored_path = "static/grad_cam_colored.png"


    cv2.imwrite(heatmap_path, heatmap_cv)
    cv2.imwrite(overlay_path, overlay)
    cv2.imwrite(heatmap_colored_path, heatmap_colored)
    print(f"Saved heatmap: {heatmap_path}")
    print(f"Saved overlay: {overlay_path}")
    print(f"Saved grad_cam_colored: {heatmap_colored_path}")


    return heatmap_path, overlay_path, heatmap_colored_path


# API Endpoint for classification
@app.route("/predict", methods=["POST"])
def predict():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400


        # Get the image from the request
        file = request.files["image"]
        img = Image.open(file).convert("RGB")  # Convert to RGB
        img = img.resize((224, 224))  # Resize to match model input
        img_array = np.array(img) / 255.0  # Normalize
        img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension


        # Make a prediction
        prediction = model.predict(img_array)
        predicted_class_index = np.argmax(prediction, axis=1)[0]
        predicted_class_label = CLASS_LABELS[predicted_class_index]

        confidence_score = float(prediction[0][predicted_class_index])

        return jsonify({
            "prediction": predicted_class_label,
            "confidence": confidence_score
        })
   
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# API Endpoint to get Grad-CAM visualizations
@app.route("/generate", methods=["POST"])
def generate():
    if "file" not in request.files:
        return {"error": "No file provided"}, 400


    file = request.files["file"]
    img_path = r"D:\projects\project-repo\inc_backend\EarlyPreB_3.png"
    file.save(img_path)


    heatmap_path, overlay_path, heatmap_colored_path = generate_visualizations(img_path)


    response_data ={
        "grad_cam": request.host_url + heatmap_path,
        "abnormal_regions": request.host_url + overlay_path,
        "grad_cam_colored": request.host_url + heatmap_colored_path
    }
    print("Flask /generate Response:", response_data)  # Debugging print
    return response_data


# API Endpoint to serve saved images
@app.route("/static/<filename>")
def serve_image(filename):
    return send_file(os.path.join("static", filename))


# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True)
