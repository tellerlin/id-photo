import React, { useRef, useState } from 'react';
import Cropper from 'react-cropper';
import { removeBackground } from '@imgly/background-removal';
import 'cropperjs/dist/cropper.css';
import './App.css';

function App() {
  const [image, setImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [isProcessing, setIsProcessing] = useState(false);
  const cropperRef = useRef(null);

  const presetColors = [
    { name: 'White', value: '#ffffff' },
    { name: 'Light Blue', value: '#a6d8ff' },
    { name: 'Blue', value: '#007bff' },
    { name: 'Red', value: '#dc3545' },
    { name: 'Gray', value: '#6c757d' },
    { name: 'Custom', value: 'custom' }
  ];

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsProcessing(true);
      try {
        const blob = await removeBackground(file);
        const reader = new FileReader();
        reader.onload = () => {
          setImage(reader.result);
          setIsProcessing(false);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error removing background:', error);
        setIsProcessing(false);
        const reader = new FileReader();
        reader.onload = () => {
          setImage(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const canvas = cropper.getCroppedCanvas();
      const ctx = canvas.getContext('2d');
      
      const newCanvas = document.createElement('canvas');
      newCanvas.width = canvas.width;
      newCanvas.height = canvas.height;
      const newCtx = newCanvas.getContext('2d');
      
      newCtx.fillStyle = backgroundColor;
      newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
      newCtx.drawImage(canvas, 0, 0);
      
      setCroppedImage(newCanvas.toDataURL());
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
    if (color !== 'custom') {
      setBackgroundColor(color);
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
          {isProcessing && (
            <div className="processing-overlay">
              <div className="loading-spinner">
                <div className="spinner-circle"></div>
                <div className="spinner-text">Processing...</div>
              </div>
            </div>
          )}
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

      {croppedImage && (
        <div className="background-selector">
          <h3>Background Color</h3>
          <div className="color-buttons">
            {presetColors.map((color) => (
              <div key={color.value} style={{ position: 'relative' }}>
                <button
                  className={`color-button ${backgroundColor === color.value ? 'selected' : ''} ${
                    color.value === 'custom' && backgroundColor !== '#ffffff' ? 'custom-selected' : ''
                  }`}
                  style={{
                    backgroundColor: color.value === 'custom' ? 'transparent' : color.value,
                    border: color.value === 'custom' ? '2px dashed #ccc' : 'none',
                    '--custom-color': color.value === 'custom' ? backgroundColor : undefined
                  }}
                  onClick={() => handleBackgroundChange(color.value)}
                >
                  {color.name}
                </button>
                {color.value === 'custom' && (
                  <input
                    type="color"
                    className="color-picker"
                    value={backgroundColor}
                    onChange={(e) => {
                      setBackgroundColor(e.target.value);
                      handleCrop();
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {croppedImage && (
        <button onClick={handleDownload} className="download-button">
          Download ID Photo
        </button>
      )}
    </div>
  );
}

export default App;
