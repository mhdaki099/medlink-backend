import os
from PIL import Image
import uuid

async def remove_white_background(input_path, output_path):
    """
    Converts a white background to transparent PNG.
    Threshold-based approach.
    """
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        new_data = []
        for item in datas:
            # item is (R, G, B, A)
            # If color is close to white (e.g. all components > 240)
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0)) # Fully transparent
            else:
                new_data.append(item)

        img.putdata(new_data)
        img.save(output_path, "PNG")
        return True
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

async def save_upload_file(upload_file, folder="documents"):
    """
    Saves a FastAPI UploadFile to the assets/uploads folder. 
    """
    # Base assets path
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets", "uploads", folder))
    if not os.path.exists(base_path):
        os.makedirs(base_path, exist_ok=True)
        
    ext = os.path.splitext(upload_file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(base_path, filename)
    
    # Use await upload_file.read() for FastAPI UploadFile
    content = await upload_file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    return f"/assets/uploads/{folder}/{filename}", file_path
