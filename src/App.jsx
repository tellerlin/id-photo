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
  const [uploadProgress, setUploadProgress] = useState('Preparing your photo...');
  const cropperRef = useRef(null);
  const [processedImage, setProcessedImage] = useState(null);

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
      setUploadProgress('Removing background...');
      
      try {
        const blob = await removeBackground(file);
        setUploadProgress('Finalizing...');
        
        // Convert blob to base64 and store it
        const reader = new FileReader();
        reader.onload = () => {
          setProcessedImage(reader.result); // Store the processed image
          setImage(reader.result);
          setIsProcessing(false);
          setUploadProgress('Preparing your photo...');
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error removing background:', error);
        setIsProcessing(false);
        setUploadProgress('Error processing image. Please try again.');
      }
    }
  };

  const createImageWithBackground = (imageData, bgColor) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the image
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageData;
    });
  };

  const handleCrop = async () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper && processedImage) {
      const croppedCanvas = cropper.getCroppedCanvas();
      
      // Create a temporary image to handle the cropped data
      const tempImage = new Image();
      tempImage.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = croppedCanvas.width;
        canvas.height = croppedCanvas.height;
        const ctx = canvas.getContext('2d');
        
        // Draw cropped image
        ctx.drawImage(tempImage, 0, 0, canvas.width, canvas.height);
        
        // Apply background color
        const finalImage = await createImageWithBackground(canvas.toDataURL(), backgroundColor);
        setCroppedImage(finalImage);
      };
      tempImage.src = processedImage;
    }
  };

  const handleDownload = async () => {
    if (!croppedImage) return;

    try {
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'id-photo.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleBackgroundChange = (color) => {
    if (color !== 'custom') {
      setBackgroundColor(color);
      if (cropperRef.current?.cropper) {
        handleCrop();
      }
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>ID Photo Generator</h1>
        <p>Create professional ID photos with automatic background removal</p>
      </header>
      
      <div className="upload-section">
        <div className="file-input-wrapper">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="file-input"
          />
          <button className="upload-button">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Photo
          </button>
        </div>
      </div>

      {image && (
        <div className="editor-container">
          <div className={`processing-overlay ${isProcessing ? 'visible' : ''}`}>
            <div className="loading-spinner">
              <div className="spinner-circle"></div>
              <div className="spinner-text">{uploadProgress}</div>
            </div>
          </div>
          
          <div className="cropper-section">
            <Cropper
              src={image}
              style={{ height: 400, width: '100%' }}
              aspectRatio={3 / 4}
              guides={true}
              ref={cropperRef}
            />
            <button onClick={handleCrop} className="button button-primary">
              Crop Image
            </button>
          </div>

          <div className="preview-section">
            {croppedImage ? (
              <div className="preview-image">
                <img src={croppedImage} alt="Cropped" />
              </div>
            ) : (
              <div className="preview-placeholder">
                <p>Please crop your image first</p>
              </div>
            )}
          </div>
        </div>
      )}

      {croppedImage && (
        <div className="background-selector">
          <h3>Choose Background Color</h3>
          <div className="color-buttons">
            {presetColors.map((color) => (
              <div key={color.value}>
                <button
                  className={`color-button ${backgroundColor === color.value ? 'selected' : ''}`}
                  style={{
                    backgroundColor: color.value === 'custom' ? backgroundColor : color.value,
                    color: ['#ffffff', '#a6d8ff'].includes(color.value) ? '#1a1a1a' : 'white',
                  }}
                  onClick={() => handleBackgroundChange(color.value)}
                  data-color={color.value}
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
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={handleDownload} className="button button-primary">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '0.5rem' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download ID Photo
          </button>
        </div>
      )}
    </div>
  );
}

export default App;