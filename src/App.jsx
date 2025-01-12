import React, { useRef, useState } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import './App.css';

function App() {
  const [image, setImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const cropperRef = useRef(null);

  const presetColors = [
    { name: 'White', value: '#ffffff' },
    { name: 'Light Blue', value: '#a6d8ff' },
    { name: 'Blue', value: '#007bff' },
    { name: 'Red', value: '#dc3545' },
    { name: 'Gray', value: '#6c757d' },
    { name: 'Custom', value: 'custom' }
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({
        fillColor: backgroundColor,
      });
      setCroppedImage(canvas.toDataURL());
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = croppedImage;
    link.download = 'id-photo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackgroundChange = (color) => {
    if (color === 'custom') {
      setShowColorPicker(true);
    } else {
      setBackgroundColor(color);
      setShowColorPicker(false);
      handleCrop();
    }
  };

  return (
    <div className="app">
      <h1>ID Photo Generator</h1>
      
      <div className="upload-section">
        <input type="file" accept="image/*" onChange={handleImageUpload} />
      </div>

      {image && (
        <div className="editor-container">
          <div className="cropper-section">
            <Cropper
              src={image}
              style={{ height: 400, width: '100%' }}
              aspectRatio={3 / 4}
              guides={true}
              ref={cropperRef}
            />
            <button onClick={handleCrop} className="crop-button">
              Crop Image
            </button>
          </div>

          <div className="preview-section">
            <h3>Preview</h3>
            {croppedImage ? (
              <div className="preview-image" style={{ backgroundColor }}>
                <img src={croppedImage} alt="Cropped" />
              </div>
            ) : (
              <p>Please crop your image first</p>
            )}
          </div>
        </div>
      )}

      <div className="background-selector">
        <h3>Background Color</h3>
        <div className="color-buttons">
          {presetColors.map((color) => (
            <button
              key={color.value}
              className={`color-button ${backgroundColor === color.value ? 'selected' : ''}`}
              style={{
                backgroundColor: color.value === 'custom' ? 'transparent' : color.value,
                border: color.value === 'custom' ? '2px dashed #ccc' : 'none'
              }}
              onClick={() => handleBackgroundChange(color.value)}
            >
              {color.name}
            </button>
          ))}
        </div>

        {showColorPicker && (
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => {
              setBackgroundColor(e.target.value);
              handleCrop();
            }}
          />
        )}
      </div>

      {croppedImage && (
        <button onClick={handleDownload} className="download-button">
          Download ID Photo
        </button>
      )}
    </div>
  );
}

export default App;
