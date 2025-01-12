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
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const cropperRef = useRef(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const presetColors = [
    { name: 'White', value: '#ffffff' },
    { name: 'Light Blue', value: '#a6d8ff' },
    { name: 'Blue', value: '#007bff' },
    { name: 'Red', value: '#dc3545' },
    { name: 'Gray', value: '#6c757d' },
    { name: 'Light Gray', value: '#f0f0f0' },
    { name: 'Dark Blue', value: '#003366' },
    { name: 'Light Red', value: '#ffcccc' },
    { name: 'Light Green', value: '#ccffcc' }
  ];

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setIsProcessing(true);
        setUploadStatus('uploading');
        setUploadProgress('正在上传图片...');
        setCroppedImage(null);
        setShowSuccessMessage(false);
        
        // 模拟上传进度
        const updateProgress = (progress) => {
          setUploadProgress(`处理中... ${progress}%`);
        };
        
        // 每200ms更新一次进度，总共10次
        for (let i = 10; i <= 90; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          updateProgress(i);
        }
        
        setUploadProgress('正在移除背景...');
        const blob = await removeBackground(file);
        
        setUploadProgress('处理完成');
        setUploadStatus('success');
        
        const reader = new FileReader();
        reader.onload = () => {
          setProcessedImage(reader.result);
          setImage(reader.result);
          setShowSuccessMessage(true);
          
          // 3秒后隐藏成功消息
          setTimeout(() => {
            setShowSuccessMessage(false);
          }, 3000);
        };
        reader.onerror = () => {
          throw new Error('Failed to read file');
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error processing image:', error);
        setUploadStatus('error');
        setUploadProgress('处理失败，请重试');
        
        // 3秒后清除错误消息
        setTimeout(() => {
          setUploadProgress('');
          setUploadStatus('');
        }, 3000);
      } finally {
        setIsProcessing(false);
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

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageData;
    });
  };

  const handleCrop = async () => {
    if (!cropperRef.current?.cropper || !processedImage) return;
    
    try {
      setIsProcessing(true);
      setUploadProgress('正在裁剪图片...');
      
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
      
      // 直接将裁剪后的图片设置为 croppedImage
      const croppedImageDataURL = croppedCanvas.toDataURL('image/png');
      setCroppedImage(croppedImageDataURL);
      
      setUploadProgress('');
    } catch (error) {
      console.error('Error cropping image:', error);
      setUploadProgress('裁剪失败，请重试');
    } finally {
      setIsProcessing(false);
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
      setUploadProgress('下载失败，请重试');
      
      setTimeout(() => {
        setUploadProgress('');
      }, 3000);
    }
  };
  
  const handleBackgroundChange = async (color) => {
    setBackgroundColor(color);
    
    if (croppedImage) {
      setIsProcessing(true);
      setUploadProgress('更换背景颜色...');
      
      try {
        const newImage = await createImageWithBackground(croppedImage, color);
        setCroppedImage(newImage);
      } catch (error) {
        console.error('Error changing background:', error);
        setUploadProgress('背景更换失败，请重试');
      } finally {
        setIsProcessing(false);
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
            disabled={isProcessing}
          />
          <button className={`upload-button ${isProcessing ? 'disabled' : ''}`}>
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
            {isProcessing ? '处理中...' : '上传照片'}
          </button>
        </div>
        
        {showSuccessMessage && (
          <div className="success-message">
            图片上传成功！
          </div>
        )}
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
            <button 
              onClick={handleCrop} 
              className="button button-primary"
              disabled={isProcessing}
            >
              {isProcessing ? '处理中...' : '裁剪图片'}
            </button>
          </div>

          <div className="preview-section">
            {croppedImage ? (
              <div className="preview-image">
                <img src={croppedImage} alt="Cropped" />
              </div>
            ) : (
              <div className="preview-placeholder">
                <p>请先裁剪图片</p>
              </div>
            )}
          </div>
        </div>
      )}

      {croppedImage && (
        <div className="background-selector">
          <h3>选择背景颜色</h3>
          <div className="color-buttons">
            {presetColors.map((color) => (
              <button
                key={color.value}
                className={`color-button ${backgroundColor === color.value ? 'selected' : ''}`}
                style={{
                  backgroundColor: color.value,
                  color: color.name.startsWith('Light') || color.name === 'White' ? 'black' : 'white',
                }}
                onClick={() => handleBackgroundChange(color.value)}
                disabled={isProcessing}
              >
                {color.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {croppedImage && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button 
            onClick={handleDownload} 
            className="button button-primary"
            disabled={isProcessing}
          >
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
            下载照片
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
