# BloodNova

🧬 BloodNova: AI-Powered B-ALL Leukemia Classification
BloodNova is an efficient and lightweight Convolutional Neural Network (CNN) model designed to classify B-cell Acute Lymphoblastic Leukemia (B-ALL) from non-cancerous blood cells using microscopic blood smear images. This system leverages the power of deep learning to provide fast, accurate, and automated diagnosis, reducing reliance on invasive procedures and minimizing human error.

📌 Project Summary
Leukemia is a type of blood cancer that affects white blood cells. Among its types, B-ALL (B-cell Acute Lymphoblastic Leukemia) is particularly common in children and progresses rapidly. Manual diagnosis through bone marrow aspiration is expensive, painful, and prone to errors. BloodNova provides an AI-based diagnostic solution using CNNs to automate and enhance the classification process.

🎯 Objectives
Develop a CNN-based model using EfficientNet-B0 architecture to classify benign hematogones and malignant B-ALL cells.
Reduce diagnostic workload and errors by automating image analysis for pathologists.
Generate AI-assisted diagnostic reports for better clinical decision-making.

📁 Dataset
The dataset consists of 3242 blood smear images collected from 89 patients across hospitals in Tehran, Iran. Images were captured using a Zeiss camera and optical microscope after standardized staining.

Classes
Benign Hematogones
Malignant B-ALL Cells , categorized into:
Early Pre-B ALL
Pre-B ALL
Pro-B ALL
All slides were stained and verified under controlled conditions by a hematology specialist to ensure consistency and reliability.

⚙️ Technical Overview
🖼 Image Preprocessing & Segmentation
Image Decoding & Resizing : All images are resized to 224x224 pixels for compatibility with CNN models.
Segmentation :
K-Means Clustering : To isolate blast cells from erythrocytes and background noise.
Binary Thresholding : Converts clustered images to black-and-white format.
Masking : Ensures only relevant regions of interest (ROIs) are retained.
🧠 Model Architecture
Base Model : EfficientNet-B0
Custom Head : Adapted for binary classification (benign vs. malignant).
Training Accuracy : 99.40%
Test Accuracy : 100%
Note: High accuracy was achieved due to consistent preprocessing and clean dataset. 

📈 Results
Training Accuracy
99.40%
Test Accuracy
100%

These results indicate the robustness and efficiency of the model in distinguishing between benign and malignant cells.

💬 RAG-Based Chatbot (Query Assistant)
A Retrieval-Augmented Generation (RAG) pipeline has been implemented to support user queries related to leukemia diagnosis. It uses authoritative sources like:

NCCN Guidelines (PDF)
Leukemia & Lymphoma Society Documents (PDFs)
This chatbot ensures reliable and accurate responses based on trusted medical literature.

🔧 Challenges Faced
Limited Dataset Availability : Only B-ALL cases were available, limiting generalization to other leukemia types.
Integration Complexity : Seamless communication between frontend, backend, and AI model server required careful orchestration.
Security & Privacy Compliance : Ensuring patient data protection as per medical standards.
Scalability : Supporting multiple users and future expansions.
🚀 Future Scope
Expand dataset to include more leukemia subtypes.
Integrate with Electronic Health Record (EHR) systems.
Enable real-time cloud-based analysis .
Develop mobile and web applications for broader accessibility.
Extend detection capabilities to other blood-related diseases .
Pursue clinical validation for hospital deployment.
✅ Conclusion
BloodNova offers a fast, efficient, and reliable tool to assist doctors in detecting B-ALL leukemia. By automating diagnosis and report generation, it significantly reduces the burden on medical professionals and improves early intervention, ultimately enhancing patient outcomes.

