import os
import zipfile
import shutil
from pathlib import Path

def process_zip(input_zip_path):
    # Get the original zip filename (without extension)
    zip_name = Path(input_zip_path).stem
    
    # Create a temporary extraction folder
    extract_dir = f"temp_{zip_name}"
    os.makedirs(extract_dir, exist_ok=True)
    
    # Extract the zip file
    with zipfile.ZipFile(input_zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
    
    # Get all chat (.txt) and questionnaire (.json) files, sorted alphabetically
    chat_files = sorted([f for f in os.listdir(extract_dir) if f.endswith(".txt")])
    questionnaire_files = sorted([f for f in os.listdir(extract_dir) if f.endswith(".json")])
    
    # Ensure there are pairs
    num_pairs = min(len(chat_files), len(questionnaire_files))
    
    # Create output directory for new zip files
    output_dir = f"output_{zip_name}"
    os.makedirs(output_dir, exist_ok=True)
    
    for i in range(num_pairs):
        chat_file = chat_files[i]
        questionnaire_file = questionnaire_files[i]
        
        # Create a new folder for the pair
        pair_dir = os.path.join(output_dir, f"{i+1}")
        os.makedirs(pair_dir, exist_ok=True)
        
        # Copy the files into the pair folder
        shutil.copy(os.path.join(extract_dir, chat_file), pair_dir)
        shutil.copy(os.path.join(extract_dir, questionnaire_file), pair_dir)
        
        # Create a zip archive for the pair
        pair_zip_path = os.path.join(output_dir, f"{zip_name}_pair_{i+1}.zip")
        with zipfile.ZipFile(pair_zip_path, 'w') as zipf:
            zipf.write(os.path.join(pair_dir, chat_file), arcname=chat_file)
            zipf.write(os.path.join(pair_dir, questionnaire_file), arcname=questionnaire_file)
        
        # Clean up the temporary pair directory
        shutil.rmtree(pair_dir)
    
    # Clean up extracted files
    shutil.rmtree(extract_dir)
    
    print(f"Created {num_pairs} zip files in {output_dir}")

# Example usage
if __name__ == "__main__":
    input_zip = "2025-2-07-0842-cod(4).zip" 
    process_zip(input_zip)
