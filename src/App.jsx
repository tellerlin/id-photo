// App.jsx
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
    const [processingMessage, setProcessingMessage] = useState('');
    const cropperRef = useRef(null);
    const [processedImage, setProcessedImage] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [imageKey, setImageKey] = useState(0); // 用于图片 src 更新的 key

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
          setProcessingMessage('Processing image');
          setShowSuccessMessage(false);
          setImageKey((prevKey) => prevKey + 1);  // 更新 key
  
          // 文件类型验证
          const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
          if (!validTypes.includes(file.type)) {
              throw new Error('Unsupported file type');
          }
  
          // 移除背景并获取 Blob
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
                    setProcessingMessage('Processing complete');
                      setShowSuccessMessage(true);
  
                      // 3秒后隐藏成功消息
                      setTimeout(() => {
                          setShowSuccessMessage(false);
                      }, 3000);
  
                      resolve();
                    
                  };
  
  
                  img.onerror = () => {
                      setIsProcessing(false); // 加载失败时也取消加载
                      reject(new Error('图像加载失败'));
                  };
  
  
                  img.src = safeDataURL;
              };
  
  
              reader.onerror = () => {
                  setIsProcessing(false); // 读取失败时也取消加载
                  reject(new Error('文件读取失败'));
              };
  
  
              // 读取 Blob
              reader.readAsDataURL(blob);
          });
  
        } catch (error) {
            console.error('图片处理错误:', error);
            setProcessingMessage(error.message || '处理失败');
           
            // 重置状态
            setImage(null);
            setProcessedImage(null);
            setCroppedImage(null);
  
        }  finally {
             setIsProcessing(false); // 确保加载状态在失败时也关闭
        }
      }
    };
    
    const handleCrop = async () => {
      if (!cropperRef.current?.cropper || !processedImage) return;
    
      try {
        setIsProcessing(true);
        setProcessingMessage('正在裁剪图片');
    
        const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
        const croppedImageDataURL = croppedCanvas.toDataURL('image/png');
    
        setCroppedImage(croppedImageDataURL);
        console.log('Image cropped successfully');
    
      } catch (error) {
        console.error('Error cropping image:', error);
         setProcessingMessage('Crop failed, please try again');
  
           setTimeout(() => {
               setProcessingMessage('');
          }, 3000);
  
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
        setProcessingMessage('Download failed, please try again');
  
           setTimeout(() => {
               setProcessingMessage('');
          }, 3000);
  
      } finally {
          setIsProcessing(false);
      }
    };
    
  
    const handleBackgroundChange = async (color) => {
        if (!processedImage || !croppedImage) return;
      
        try {
          setIsProcessing(true);
          setProcessingMessage('更换背景颜色');
          setBackgroundColor(color);
      
          // 使用 cropperRef 重新裁剪
          const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
            // 使用与之前相同的裁剪设置
            width: cropperRef.current.cropper.getCroppedCanvas().width,
            height: cropperRef.current.cropper.getCroppedCanvas().height
          });
      
          // 在裁剪的 canvas 上添加背景色
          const canvas = document.createElement('canvas');
          canvas.width = croppedCanvas.width;
          canvas.height = croppedCanvas.height;
          const ctx = canvas.getContext('2d');
      
          // 填充背景色
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      
          // 绘制裁剪后的图像
          ctx.drawImage(croppedCanvas, 0, 0);
      
          // 生成新的图像
          const newImageWithBackground = canvas.toDataURL('image/png');
          
          // 更新裁剪图像
          setCroppedImage(newImageWithBackground);
        
        } catch (error) {
          console.error('Error changing background:', error);
           setProcessingMessage('背景更换失败,请重试');
  
             setTimeout(() => {
                 setProcessingMessage('');
            }, 3000);
  
        } finally {
          setIsProcessing(false);
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
            <button className={`upload-button ${isProcessing ? 'disabled' : ''} ${isProcessing ? 'loading-button' : ''}`}>
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
               {isProcessing ? 'Processing' : 'Upload photo'}
            </button>
          </div>
          
          {showSuccessMessage && (
            <div className="success-message">
              Image uploaded successfully!
            </div>
          )}
        </div>
  
        {image && (
          <div className="editor-container">
            <div className={`processing-overlay ${isProcessing ? 'visible' : ''}`}>
              <div className="loading-spinner">
                <div className="spinner-circle"></div>
                <div className="spinner-text">{processingMessage}</div>
              </div>
            </div>
            
            <div className="cropper-section">
              <Cropper
                src={image}
                style={{ height: 400, width: '100%' }}
                aspectRatio={3 / 4}
                guides={true}
                ref={cropperRef}
                zoomable={false}
                zoomOnWheel={false}
              />
              <button 
                onClick={handleCrop} 
                className={`button button-primary ${isProcessing ? 'loading-button' : ''}`}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing' : 'Crop image'}
              </button>
            </div>
  
              { (croppedImage || processedImage || image) && (
                <div className="preview-section">
                    <div className="preview-image">
                        <img 
                            key={imageKey} 
                            src={croppedImage || processedImage || image}
                            alt="Processed image"
                            onError={(e) => {
                                e.target.src = '';
                            }}
                            style={{ display: isProcessing && !(croppedImage || processedImage || image) ? 'none' : 'block' }}
                        />
                    </div>
                </div>
              )}
  
          </div>
        )}
  
        {croppedImage && (
          <div className="background-selector">
            <h3>Select background color</h3>
            <div className="color-buttons">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  className={`color-button ${backgroundColor === color.value ? 'selected' : ''}`}
                   data-color={color.name} // 添加 data-color 属性
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
              className={`button button-primary ${isProcessing ? 'loading-button' : ''}`}
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
              Download photo
            </button>
          </div>
        )}
      </div>
    );
  }
  
  export default App;
