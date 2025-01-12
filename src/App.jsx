import React, { useRef, useState, useEffect } from 'react';
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

  useEffect(() => {
    if (processedImage) {
      setCroppedImage(processedImage);
    }
  }, [processedImage]);
  

const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (file) {
      try {
          // 重置所有相关状态
          setImage(null);
          setProcessedImage(null);
          setCroppedImage(null);
          setIsProcessing(true);
          setUploadProgress('正在处理图片...');
          setShowSuccessMessage(false);


          // 文件验证
          const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
          if (!validTypes.includes(file.type)) {
              throw new Error('不支持的文件类型');
          }


          // 移除背景
          const blob = await removeBackground(file);


          // 使用 FileReader 读取 Blob
          const reader = new FileReader();
          
          return new Promise((resolve, reject) => {
              reader.onloadend = () => {
                  // 确保是完整的 data URL
                  const safeDataURL = reader.result.startsWith('data:image')
                      ? reader.result
                      : `data:image/png;base64,${reader.result}`;


                  // 创建图像并验证
                  const img = new Image();
                  img.onload = () => {
                      // 使用 canvas 确保图像可用
                      const canvas = document.createElement('canvas');
                      canvas.width = img.width;
                      canvas.height = img.height;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img, 0, 0);


                      // 生成最终的 data URL
                      const finalDataURL = canvas.toDataURL('image/png');


                      // 更新状态
                      setProcessedImage(finalDataURL);
                      setImage(finalDataURL);
                      setCroppedImage(finalDataURL);


                      setUploadProgress('处理完成');
                      setShowSuccessMessage(true);


                      // 3秒后隐藏成功消息
                      setTimeout(() => {
                          setShowSuccessMessage(false);
                      }, 3000);


                      resolve();
                  };


                  img.onerror = () => {
                      reject(new Error('图像加载失败'));
                  };


                  img.src = safeDataURL;
              };


              reader.onerror = () => {
                  reject(new Error('文件读取失败'));
              };


              // 读取 Blob
              reader.readAsDataURL(blob);
          });


      } catch (error) {
          console.error('图片处理错误:', error);
          setUploadProgress(error.message || '处理失败');
          
          // 重置状态
          setImage(null);
          setProcessedImage(null);
          setCroppedImage(null);


      } finally {
          setIsProcessing(false);
      }
  }
};

  const createImageWithBackground = (imageData, bgColor) => {
    return new Promise((resolve, reject) => {
      // 确保 imageData 是完整的 Base64 字符串
      const fullBase64 = imageData.startsWith('data:image') 
        ? imageData 
        : `data:image/png;base64,${imageData}`;


      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
  
        // 先填充背景色
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制图像
        ctx.drawImage(img, 0, 0);
  
        // 确保返回完整的 data URL
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      };
      img.onerror = (error) => {
        console.error('Image load error:', error);
        reject(new Error('Failed to load image'));
      };
      img.src = fullBase64;
    });
};
  
  const handleCrop = async () => {
    if (!cropperRef.current?.cropper || !processedImage) return;
  
    try {
      setIsProcessing(true);
      setUploadProgress('正在裁剪图片...');
  
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
      const croppedImageDataURL = croppedCanvas.toDataURL('image/png');
  
      setCroppedImage(croppedImageDataURL);
      console.log('Image cropped successfully');
      setUploadProgress(''); // Clear progress message after successful crop
  
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
  if (!processedImage) return;


  try {
      setIsProcessing(true);
      setUploadProgress('更换背景颜色...');
      setBackgroundColor(color);


      // 确保是完整的 data URL
      const fullBase64Image = processedImage.startsWith('data:image')
          ? processedImage
          : `data:image/png;base64,${processedImage}`;


      console.log('Creating new image with background:', color);
      const newImageWithBackground = await createImageWithBackground(fullBase64Image, color);
      console.log('New image created:', newImageWithBackground);
      
      // 直接设置新图像
      setCroppedImage(newImageWithBackground);
      console.log('Cropped image updated');
      
      setUploadProgress('');
  } catch (error) {
      console.error('Error changing background:', error);
      setUploadProgress('背景更换失败,请重试');
  } finally {
      setIsProcessing(false);
  }
};

  // ... in your JSX ... 
{(croppedImage || processedImage || image) && (
  <div className="preview-section">
      <div className="preview-image">
          <img 
              key={Date.now()} 
              src={croppedImage || processedImage || image}
              alt="处理后的图像"
              onError={(e) => {
                  console.error('Image load error', e);
                  console.log('Problematic image data:', 
                      croppedImage || processedImage || image
                  );
                  console.log('Current background color:', backgroundColor);
                  e.target.src = '';
              }}
          />
      </div>
  </div>
)}
  
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

          {croppedImage && ( // Only render the img if croppedImage exists
            <div className="preview-section">
                <div className="preview-image">
                  <img 
                    key={croppedImage}
                    src={croppedImage} 
                    alt="Cropped" 
                  />
                </div>
            </div>
          )}

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
