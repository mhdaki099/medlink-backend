from PIL import Image, ImageDraw
import os

def test_pill():
    try:
        # Create a tiny image
        img = Image.new('RGBA', (10, 10), color = (255, 255, 255, 255))
        d = ImageDraw.Draw(img)
        d.text((1,1), "Hi", fill=(0,0,0,255))
        img.save("test_pill.png")
        print("Pillow test SAFE: test_pill.png created.")
        
        # Test background removal logic
        img = Image.open("test_pill.png").convert("RGBA")
        datas = img.getdata()
        new_data = []
        for item in datas:
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        img.putdata(new_data)
        img.save("test_pill_processed.png")
        print("Pillow processing SAFE: test_pill_processed.png created.")
        return True
    except Exception as e:
        print(f"Pillow test FAILED: {e}")
        return False

if __name__ == "__main__":
    test_pill()
