import React, { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import './App.css';
import outline from './assets/outline.png';
import { removeBackground } from '@imgly/background-removal';

function App() {
    const [image, setImage] = useState(null);
    const [processedImage, setProcessedImage] = useState(null);
    const [croppedImage, setCroppedImage] = useState(null);
    const [correctionImage, setCorrectionImage] = useState(null);
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [imageKey, setImageKey] = useState(0);
    const cropperRef = useRef(null);
    const imageRef = useRef(new Image());
    const lastProcessedImageData = useRef(null);
    const [imageWidth, setImageWidth] = useState(0);
    const [imageHeight, setImageHeight] = useState(0);
    const imageOverlayRef = useRef(null);
    const imageContainerRef = useRef(null);
   
    // 新增：支持的比例选项
    const aspectRatioOptions = useMemo(() => [
        { value: 1 / 1, label: '1:1' },
        { value: 2 / 3, label: '2:3' },
        { value: 3 / 4, label: '3:4' },
        { value: 4 / 3, label: '4:3' },
        { value: 5 / 7, label: '5:7' },
        { value: 7 / 9, label: '7:9' },
        { value: 9 / 7, label: '9:7' },
    ], []);

    // 新增：当前选择的比例，默认3:4
    const [selectedAspectRatio, setSelectedAspectRatio] = useState(3 / 4);

    useEffect(() => {
        if (cropperRef.current?.cropper) {
            const canvasData = cropperRef.current.cropper.getCanvasData();
            const cropBoxData = cropperRef.current.cropper.getCropBoxData();
            
            console.log('Canvas Data:', canvasData);
            console.log('Crop Box Data:', cropBoxData);
            
            setImageWidth(canvasData.width);
            setImageHeight(canvasData.height);
        }
    }, [selectedAspectRatio, image]);

    // 缓存预设颜色，避免重复渲染
    const presetColors = useMemo(() => [
        { name: 'White', value: '#ffffff' },
        { name: 'Red', value: '#ff0000' },
        { name: 'Blue', value: '#0000ff' },
        { name: 'Bright Blue', value: '#4285F4' },
        { name: 'Light Blue', value: '#add8e6' },
        { name: 'Sky Blue', value: '#87ceeb' },
        { name: 'Navy Blue', value: '#000080' },
        { name: 'Gray', value: '#808080' },
        { name: 'Light Gray', value: '#d3d3d3' },
    ], []);
    
    // 使用useMemo缓存智能裁剪函数，避免不必要的重新创建
    const intelligentCrop = useMemo(() => {
        return (img) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
        
            let topY = canvas.height, 
                bottomY = 0, 
                leftX = canvas.width, 
                rightX = 0;
        
            const rowCenters = [];
            const rowWidths = [];
        
            for (let y = 0; y < canvas.height; y++) {
                let rowLeftX = canvas.width;
                let rowRightX = 0;
                let rowPixelCount = 0;
                let rowCenterX = 0;
        
                for (let x = 0; x < canvas.width; x++) {
                    const index = (y * canvas.width + x) * 4;
                    const alpha = data[index + 3];
                    if (alpha > 10) {
                        topY = Math.min(topY, y);
                        bottomY = Math.max(bottomY, y);
                        leftX = Math.min(leftX, x);
                        rightX = Math.max(rightX, x);
                        rowLeftX = Math.min(rowLeftX, x);
                        rowRightX = Math.max(rowRightX, x);
                        rowCenterX += x;
                        rowPixelCount++;
                    }
                }
        
                rowWidths.push(rowRightX - rowLeftX);
                if (rowPixelCount > 0) {
                    rowCenters.push(rowCenterX / rowPixelCount);
                }
            }
            
            const widthChanges = [];
            for (let i = 1; i < rowWidths.length; i++) {
                const changeRate = (rowWidths[i] - rowWidths[i - 1]) / rowWidths[i - 1];
                widthChanges.push(changeRate);
            }
        
            let headEndY = topY;
            let shoulderEndY = bottomY;
            let maxWidthChangeIndex = -1;
            let maxWidthChange = 0;
        
            widthChanges.forEach((change, index) => {
                if (change > maxWidthChange) {
                    maxWidthChange = change;
                    maxWidthChangeIndex = index;
                }
            });
        
            if (maxWidthChangeIndex !== -1) {
                headEndY = topY + maxWidthChangeIndex;
                shoulderEndY = Math.min(bottomY, headEndY + (bottomY - topY) * 0.3);
            }
            
            const personCenterX = rowCenters.reduce((sum, center) => sum + center, 0) / rowCenters.length;
            const personWidth = rightX - leftX;
            const personHeight = bottomY - topY;
            const aspectRatio = img.width / img.height;
            let recommendedWidth, recommendedHeight;
        
             if (aspectRatio < 0.5) {  
                recommendedWidth = personWidth * 0.5; 
                recommendedHeight = recommendedWidth * selectedAspectRatio; 
            } else {
                recommendedWidth = personWidth * 0.7; 
                recommendedHeight = recommendedWidth * selectedAspectRatio;
            }
        
            const verticalOffset = topY + (personHeight * 0.25); 
            const cropData = {
                left: personCenterX - (recommendedWidth / 2),
                top: verticalOffset,
                width: recommendedWidth,
                height: recommendedHeight
            };
        
             cropData.left = Math.max(0, Math.min(cropData.left, img.width - cropData.width));
            cropData.top = Math.max(0, Math.min(cropData.top, img.height - cropData.height));
        
            console.log('Intelligent Crop Precise Details:', {
                imageSize: `${img.width}x${img.height}`,
                aspectRatio: aspectRatio,
                personArea: {
                    top: topY,
                    bottom: bottomY,
                    left: leftX,
                    right: rightX,
                    width: personWidth,
                    height: personHeight,
                    centerX: personCenterX
                },
                cropDetails: {
                    verticalOffset,
                    recommendedHeadHeight: recommendedHeight,
                    cropHeight: cropData.height,
                    cropWidth: cropData.width,
                    cropTop: cropData.top,
                    cropLeft: cropData.left
                }
            });
            return cropData;
        };
    }, [selectedAspectRatio]);

    const handleImageUpload = useCallback(async (e) => {
         const file = e.target.files[0];
        if (!file) return;
    
        try {
            // 重置状态
            setImage(null);
            setProcessedImage(null);
            setCroppedImage(null);
            setIsProcessing(true);
             setProcessingMessage('Processing image');
            setShowSuccessMessage(false);
            setImageKey((prevKey) => prevKey + 1);
            setCorrectionImage(null);
    
            // 详细日志组
            console.group('Image Upload and Processing');
            console.time('TotalProcessingTime');
    
    
             const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'];
           if (!validTypes.includes(file.type)) {
              throw new Error(`Unsupported file type. Supported formats: ${validTypes.join(', ')}`);
            }
    
            // 使用 Promise.all 并行处理文件读取和背景移除
            const [blob] = await Promise.all([
                 removeBackground(file)
            ]);
    
            if (!blob) {
                throw new Error('Background removal failed.');
             }
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // 安全检查dataURL
                      const safeDataURL = reader.result.startsWith('data:image')
                        ? reader.result
                        : `data:image/png;base64,${reader.result}`;
                      imageRef.current.onload = () => {
                            const img = imageRef.current;
                             console.log('Image Loaded Details:', {
                                width: img.width,
                                height: img.height,
                                aspectRatio: img.width / img.height
                            });
    
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
    
                            const finalDataURL = canvas.toDataURL('image/png');
                            // 设置初始图片
                           setImage(finalDataURL);
                            setProcessedImage(finalDataURL);
                            setCroppedImage(finalDataURL);
                            lastProcessedImageData.current = {
                                dataURL: finalDataURL,
                                width: img.width,
                                height: img.height,
                                aspectRatio: img.width / img.height
                             };
                             
                             // 智能裁剪延迟处理
                            setTimeout(() => {
                                if (cropperRef.current?.cropper) {
                                     const cropper = cropperRef.current.cropper;
                                     const autoCropData = intelligentCrop(img);
                                    console.log('Auto crop data:', autoCropData);
    
    
                                    const imageData = cropper.getImageData();
                                    const canvasData = cropper.getCanvasData();
                        
                                   // 调试日志：输出关键缩放信息
                                    console.log('Image Data:', {
                                       naturalWidth: imageData.naturalWidth,
                                        naturalHeight: imageData.naturalHeight,
                                        width: imageData.width,
                                         height: imageData.height
                                    });
    
                                    console.log('Canvas Data:', {
                                       naturalWidth: canvasData.naturalWidth,
                                        naturalHeight: canvasData.naturalHeight,
                                       width: canvasData.width,
                                         height: canvasData.height
                                   });
    
                                    const scaleX = canvasData.width / imageData.naturalWidth;
                                   const scaleY = canvasData.height / imageData.naturalHeight;
                                   console.log('Scale Factors:', { scaleX, scaleY });
                        
                                   const scaledCropData = {
                                        left: autoCropData.left * scaleX,
                                        top: autoCropData.top * scaleY,
                                        width: autoCropData.width * scaleX,
                                        height: autoCropData.height * scaleY
                                  };
    
                                    console.log('Scaled Crop Data:', scaledCropData);
    
                                    cropper.setCropBoxData({
                                       left: scaledCropData.left,
                                         top: scaledCropData.top,
                                        width: scaledCropData.width,
                                        height: scaledCropData.height
                                   });
    
                                    console.log('Final Cropper Box Configuration:', cropper.getCropBoxData());
                               }
                           }, 100);
                            // 处理完成提示
                            setProcessingMessage('Processing complete');
                           setShowSuccessMessage(true);
                            setTimeout(() => {
                               setShowSuccessMessage(false);
                            }, 3000);
                            
                            console.timeEnd('TotalProcessingTime');
                            console.groupEnd();
                            resolve();
                        };
                           
                         imageRef.current.onerror = () => {
                            console.error('Image Loading Failed');
                           setIsProcessing(false);
                           reject(new Error('Image loading failed'));
                        };
                       imageRef.current.src = safeDataURL;
                   };
                   reader.onerror = () => {
                        console.error('File Reading Failed');
                       setIsProcessing(false);
                        reject(new Error('File reading failed'));
                   };
                   reader.readAsDataURL(blob);
            });
        } catch (error) {
             console.error('Image Processing Error:', error);
           setProcessingMessage(error.message || 'Processing failed');
            setImage(null);
           setProcessedImage(null);
            setCroppedImage(null);
            setCorrectionImage(null);
        } finally {
            setIsProcessing(false);
        }
    }, [intelligentCrop]);


     const handleCropChange = useCallback(() => {
        if (!cropperRef.current?.cropper || !image) return;
        
        try {
            const cropper = cropperRef.current.cropper;
            const croppedCanvas = cropper.getCroppedCanvas();
            const croppedImageDataURL = croppedCanvas.toDataURL('image/png');
            
            // 确保设置裁剪图像
            setCroppedImage(croppedImageDataURL);
            
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // 确保设置修正图像
                setCorrectionImage(canvas.toDataURL('image/png'));
                
                // 获取画布数据并设置尺寸
                const canvasData = cropper.getCanvasData();
                console.log('handleCropChange Canvas Data:', {
                     width: canvasData.width,
                    height: canvasData.height
                })
                setImageWidth(Math.round(canvasData.width));
                setImageHeight(Math.round(canvasData.height));

                 if (imageContainerRef.current) {
                    imageContainerRef.current.style.width = `${Math.round(canvasData.width)}px`;
                     imageContainerRef.current.style.height = `${Math.round(canvasData.height)}px`;
                }
            };
            img.src = croppedImageDataURL;
        } catch (error) {
            console.error('Error updating preview:', error);
        }
    }, [image]);
    
   // 使用 useLayoutEffect 来确保 outline 尺寸同步
    useLayoutEffect(() => {
        if (cropperRef.current?.cropper && imageOverlayRef.current && imageContainerRef.current) {
            const canvasData = cropperRef.current.cropper.getCanvasData();
            const cropBoxData = cropperRef.current.cropper.getCropBoxData();
            
             console.log('useLayoutEffect Canvas Width:', canvasData.width);
             console.log('useLayoutEffect Canvas Height:', canvasData.height);
            console.log('useLayoutEffect CropBox Width:', cropBoxData.width);
            console.log('useLayoutEffect CropBox Height:', cropBoxData.height);

            // 使用 canvasData 的尺寸
            setImageWidth(Math.round(canvasData.width));
            setImageHeight(Math.round(canvasData.height));
            
            // 更新 image-overlay 的尺寸
            imageOverlayRef.current.style.width = `${Math.round(canvasData.width)}px`;
            imageOverlayRef.current.style.height = `${Math.round(canvasData.height)}px`;
            
            // 更新 image-container 的尺寸
           imageContainerRef.current.style.width = `${Math.round(canvasData.width)}px`;
          imageContainerRef.current.style.height = `${Math.round(canvasData.height)}px`;
        }
    }, [correctionImage, selectedAspectRatio]);


     // 新增：处理比例选择的函数
    const handleAspectRatioChange = useCallback((ratio) => {
        setSelectedAspectRatio(ratio);
        if (cropperRef.current?.cropper) {
            cropperRef.current.cropper.setAspectRatio(ratio);
             // 触发重新裁剪，更新预览
            handleCropChange();
         }
    }, [handleCropChange]);

    const handleDownload = useCallback(async () => {
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
       }
    }, [croppedImage]);


     const handleBackgroundChange = useCallback(async (color) => {
         if (!image || !cropperRef.current?.cropper) return;
    
        try {
            setIsProcessing(true);
            setProcessingMessage('Changing background color');
           setBackgroundColor(color);
            
           const cropper = cropperRef.current.cropper;
            const croppedCanvas = cropper.getCroppedCanvas({
                width: cropper.getImageData().naturalWidth,
               height: cropper.getImageData().naturalHeight
          });
    
           const canvas = document.createElement('canvas');
           canvas.width = croppedCanvas.width;
            canvas.height = croppedCanvas.height;
            const ctx = canvas.getContext('2d');
    
           ctx.fillStyle = color;
           ctx.fillRect(0, 0, canvas.width, canvas.height);
           ctx.drawImage(croppedCanvas, 0, 0);
    
            const newImageDataURL = canvas.toDataURL('image/png');
           setProcessedImage(newImageDataURL);
           setCroppedImage(newImageDataURL);
    
            setProcessingMessage('Processing complete');
            setShowSuccessMessage(true);
            setTimeout(() => {
                setShowSuccessMessage(false);
           }, 3000);
        } catch (error) {
            console.error('Background change error:', error);
        } finally {
           setIsProcessing(false);
        }
    }, [image]);

    return (
       <div className="app">
           <header className="header">
                <h1>ID Photo Generator</h1>
               <p>Create professional ID photos with automatic background removal</p>
            </header>
            <div className="process-steps">
                <div className={`process-step ${image ? 'completed' : 'active'}`}>
                    <div className="process-step-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                   </div>
                    <div className="process-step-label">Upload</div>
                </div>
                <div className={`process-step ${croppedImage ? 'completed' : (image ? 'active' : '')}`}>
                    <div className="process-step-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                        </svg>
                   </div>
                    <div className="process-step-label">Crop</div>
                </div>
               <div className={`process-step ${backgroundColor !== '#ffffff' ? 'completed' : (croppedImage ? 'active' : '')}`}>
                    <div className="process-step-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                   </div>
                   <div className="process-step-label">Background</div>
                </div>
               <div className={`process-step ${croppedImage && backgroundColor !== '#ffffff' ? 'completed' : ''}`}>
                   <div className="process-step-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                           <polyline points="7 10 12 15 17 10"/>
                           <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                   </div>
                   <div className="process-step-label">Download</div>
                </div>
            </div>
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
                           style={{ height: 400, width: 300 }}
                             aspectRatio={selectedAspectRatio}
                            guides={true}
                           ref={cropperRef}
                            zoomable={false}
                            zoomOnWheel={false}
                            crop={handleCropChange}
                            minCropBoxWidth={100}
                            minCropBoxHeight={100}
                            autoCropArea={1}
                            viewMode={1}
                        />
                         {/* 新增：比例选择下拉菜单 */}
                            <div className="aspect-ratio-selector">
                                <select
                                    value={selectedAspectRatio}
                                    onChange={(e) => handleAspectRatioChange(parseFloat(e.target.value))}
                                    disabled={isProcessing}
                                >
                                    {aspectRatioOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                    </div>
                   <div className="correction-section">
                         {correctionImage && (
                             <div className="image-container" ref={imageContainerRef}>
                                    <img 
                                        src={correctionImage} 
                                        alt="Correction" 
                                        className="image-base" 
                                    />
                                    <div className="image-overlay" ref={imageOverlayRef}>
                                        <img 
                                            src={outline} 
                                            alt="Outline" 
                                            style={{
                                                    width: '100%',
                                                    height: '100%',
                                                display: 'block',
                                                opacity: 0.5
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                    </div>
                    { (croppedImage || processedImage || image) && (
                        <div className="preview-section">
                            <div className="image-container">
                                <img
                                    key={imageKey}
                                    src={croppedImage || processedImage || image}
                                    alt="Processed image"
                                    className="image-base"
                                    style={{ display: isProcessing && !(croppedImage || processedImage || image) ? 'none' : 'block' }}
                                    onError={(e) => {
                                        e.target.src = '';
                                    }}
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
                                data-color={color.name}
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
