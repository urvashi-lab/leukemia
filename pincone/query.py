import os
from flask import Flask, request, jsonify, render_template
from pinecone import Pinecone
# changed
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv
from flask_cors import CORS 
# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app) 

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("Gemini API key is missing. Check your .env file.")
genai.configure(api_key=GEMINI_API_KEY)

# Initialize Pinecone connection
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
if not PINECONE_API_KEY:
    raise ValueError("Pinecone API key is missing. Check your .env file.")
index_name = "pineconerag"
# change
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(index_name)

# Initialize embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

def query_pinecone(query_text: str, top_k: int = 5) -> List[Dict[Any, Any]]:
    """
    Generate embeddings for a query and search the Pinecone index.
   
    Args:
        query_text: The text query to search for
        top_k: Number of most similar results to return
   
    Returns:
        List of documents with their content
    """
    # Generate embedding for the query
    query_embedding = model.encode(query_text, convert_to_numpy=True).tolist()
   
    # Query the index
    query_results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )
   
    # Format results - only return document content without scores
    results = []
    for match in query_results["matches"]:
        results.append({
            "document": match["metadata"]["text"]
        })
   
    return results

def generate_gemini_response(query: str, context: List[Dict[Any, Any]]):
    """
    Generate a response using Gemini based on retrieved context.
   
    Args:
        query: The user's question
        context: The retrieved document chunks
   
    Returns:
        The generated response
    """
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    # Combine context documents into a single text
    context_text = "\n\n".join([doc["document"] for doc in context])
    # Enhanced prompt to get detailed answers
    prompt = f"""
You are an AI assistant specialized in retrieving and synthesizing information.
Use the provided context to answer the question in detail comprehensively.
If the context does not have enough information, DONT ignore details.
### Context:
{context_text}
### User Question:
{query}
### Answer in detail:
"""
    # Configure generation settings to allow longer responses
    generation_config = genai.types.GenerationConfig(
        max_output_tokens=1024,  # Increased response length
        temperature=0.7,  # Balanced creativity
        top_p=0.9
    )
    # Generate response
    response = model.generate_content(prompt, generation_config=generation_config)
    return response.text.strip() if response and response.text else "I couldn't generate a detailed response."

# Flask routes
@app.route('/')
def home():
    """Render the main chatbot interface"""
    return render_template('boilerplate.ejs')

@app.route('/api/initialize', methods=['GET'])
def initialize():
    """Endpoint triggered when chatbot is opened"""
    return jsonify({
        "status": "initialized",
        "model_ready": True,
        "system_message": "Welcome to the Leukemia Detection Assistant. How can I help you today?"
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Process chat messages using the RAG pipeline"""
    data = request.json
    user_message = data.get('message', '')
   
    if not user_message:
        return jsonify({"response": "I didn't receive a question. Please try again."})
   
    try:
        # Retrieve relevant documents
        results = query_pinecone(user_message, top_k=5)
       
        # Generate response using retrieved context
        if results:
            answer = generate_gemini_response(user_message, results)
            return jsonify({"response": answer})
        else:
            return jsonify({"response": "I couldn't find relevant information for your question. Could you please rephrase or ask something else?"})
   
    except Exception as e:
        print(f"Error processing request: {e}")
        return jsonify({"response": "I encountered an error while processing your request. Please try again later."})

if __name__ == '__main__':
    app.run(debug=True, port=4000)  