import React, { useState, useRef, useEffect } from 'react';
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


    const presetColors = [
        { name: 'White', value: '#ffffff' },
        { name: 'Red', value: '#ff0000' },
        { name: 'Blue', value: '#0000ff' },
        { name: 'Bright Blue', value: '#4285F4' },
        { name: 'Light Blue', value: '#add8e6' },
        { name: 'Sky Blue', value: '#87ceeb' },
        { name: 'Navy Blue', value: '#000080' },
        { name: 'Gray', value: '#808080' },
        { name: 'Light Gray', value: '#d3d3d3' },
    ];


    // 智能裁剪函数
    const intelligentCrop = (img) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
    
    
        // 检测有效区域
        let topY = canvas.height, 
            bottomY = 0, 
            leftX = canvas.width, 
            rightX = 0;
    
    
        // 存储每一行的有效像素中心点
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
                    // 更新总体有效区域
                    topY = Math.min(topY, y);
                    bottomY = Math.max(bottomY, y);
                    leftX = Math.min(leftX, x);
                    rightX = Math.max(rightX, x);
    
    
                    // 更新当前行的有效区域和中心
                    rowLeftX = Math.min(rowLeftX, x);
                    rowRightX = Math.max(rowRightX, x);
                    rowCenterX += x;
                    rowPixelCount++;
                }
            }
    
    
            // 记录行宽和中心
            rowWidths.push(rowRightX - rowLeftX);
            if (rowPixelCount > 0) {
                rowCenters.push(rowCenterX / rowPixelCount);
            }
        }
    
    
        // 分析宽度变化率
        const widthChanges = [];
        for (let i = 1; i < rowWidths.length; i++) {
            const changeRate = (rowWidths[i] - rowWidths[i-1]) / rowWidths[i-1];
            widthChanges.push(changeRate);
        }
    
    
        // 找到宽度变化最显著的区域
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
    
    
        // 头部和肩部的大致位置
        if (maxWidthChangeIndex !== -1) {
            headEndY = topY + maxWidthChangeIndex;
            // 假设肩部在头部下方一定范围内
            shoulderEndY = Math.min(bottomY, headEndY + (bottomY - topY) * 0.3);
        }
    
    
        // 计算人体中心线
        const personCenterX = rowCenters.reduce((sum, center) => sum + center, 0) / rowCenters.length;
    
    
        // 裁剪框计算
        const personWidth = rightX - leftX;
        const recommendedWidth = personWidth * 0.7;  // 取70%宽度
        const recommendedHeight = recommendedWidth * (4/3);  // 3:4比例
    
    
        // 关键优化：动态计算头顶空白
        const headTopBuffer = Math.max(
            recommendedHeight * 0.1,  // 最小保留10%高度作为头顶空白
            Math.min(
                recommendedHeight * 0.2,  // 最大不超过20%
                (headEndY - topY) * 0.3   // 考虑实际头部区域
            )
        );
    
    
        const cropData = {
            // 使用人体中心线进行水平居中
            left: personCenterX - (recommendedWidth / 2),
            top: Math.max(topY, headEndY - headTopBuffer),  // 向上调整
            width: recommendedWidth,
            height: recommendedHeight
        };
    
    
        // 安全边界检查
        cropData.left = Math.max(0, Math.min(cropData.left, img.width - cropData.width));
        cropData.top = Math.max(0, Math.min(cropData.top, img.height - cropData.height));
    
    
        console.log('Intelligent Crop Precise Details:', {
            imageSize: `${img.width}x${img.height}`,
            personArea: {
                top: topY,
                bottom: bottomY,
                left: leftX,
                right: rightX,
                width: personWidth,
                height: bottomY - topY,
                centerX: personCenterX
            },
            cropDetails: {
                headTopBuffer,
                recommendedHeadHeight: recommendedHeight,
                cropHeight: cropData.height,
                cropWidth: cropData.width,
                cropTop: cropData.top,
                cropLeft: cropData.left
            },
            widthChanges: {
                maxChange: maxWidthChange,
                maxChangeIndex: maxWidthChangeIndex
            }
        });
    
    
        return cropData;
    };

    const handleImageUpload = async (e) => {
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
    
    
            // 文件类型验证
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'];
            if (!validTypes.includes(file.type)) {
                throw new Error(`Unsupported file type. Supported formats: ${validTypes.join(', ')}`);
            }
    
    
            // 移除背景
            const blob = await removeBackground(file);
            if (!blob) {
                throw new Error('Background removal failed.');
            }
    
    
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onloadend = () => {
                    const safeDataURL = reader.result.startsWith('data:image')
                        ? reader.result
                        : `data:image/png;base64,${reader.result}`;
    
    
                    const img = new Image();
                    img.onload = () => {
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
                        setProcessedImage(finalDataURL);
                        setImage(finalDataURL);
                        setCroppedImage(finalDataURL);
    
    
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
                        
                        
                                // 计算精确的缩放比例
                                const scaleX = canvasData.width / imageData.naturalWidth;
                                const scaleY = canvasData.height / imageData.naturalHeight;
                        
                        
                                console.log('Scale Factors:', { scaleX, scaleY });
                        
                        
                                // 转换裁剪坐标
                                const scaledCropData = {
                                    left: autoCropData.left * scaleX,
                                    top: autoCropData.top * scaleY,
                                    width: autoCropData.width * scaleX,
                                    height: autoCropData.height * scaleY
                                };
                        
                        
                                console.log('Scaled Crop Data:', scaledCropData);
                        
                        
                                // 设置裁剪框，增加安全检查
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
    
    
                    img.onerror = () => {
                        console.error('Image Loading Failed');
                        setIsProcessing(false);
                        reject(new Error('Image loading failed'));
                    };
    
    
                    img.src = safeDataURL;
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
            
            // 重置所有状态
            setImage(null);
            setProcessedImage(null);
            setCroppedImage(null);
            setCorrectionImage(null);
    
    
        } finally {
            setIsProcessing(false);
        }
    };


    const handleCropChange = () => {
        if (!cropperRef.current?.cropper || !image) return;

        try {
             const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
            const croppedImageDataURL = croppedCanvas.toDataURL('image/png');
            setCroppedImage(croppedImageDataURL);
           
            // 生成无背景图，用于outline
            const img = new Image();
            img.onload = () => {
               const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                setCorrectionImage(canvas.toDataURL('image/png'));
            };
           img.src=croppedImageDataURL;
        } catch (error) {
            console.error('Error updating preview:', error);
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
        }
    };


    const handleBackgroundChange = async (color) => {
        if (!image || !cropperRef.current?.cropper) return;
    
    
        try {
            setIsProcessing(true);
            setProcessingMessage('Changing background color');
            setBackgroundColor(color);
            
            const cropper = cropperRef.current.cropper;
            // 获取当前完整的裁剪画布
            const croppedCanvas = cropper.getCroppedCanvas({
                // 明确指定与原始图像相同的宽高
                width: cropper.getImageData().naturalWidth,
                height: cropper.getImageData().naturalHeight
            });
    
    
            const canvas = document.createElement('canvas');
            canvas.width = croppedCanvas.width;  // 保持原始宽度
            canvas.height = croppedCanvas.height;  // 保持原始高度
            const ctx = canvas.getContext('2d');
    
    
            // 用指定颜色填充完整背景
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 绘制完整的裁剪图像
            ctx.drawImage(croppedCanvas, 0, 0);
    
    
            // 将新画布转换为数据URL
            const newImageDataURL = canvas.toDataURL('image/png');
            
            // 更新图像，保持原始大小
            setProcessedImage(newImageDataURL);
             // 更新 croppedImage 以便预览
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
    };

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
                            aspectRatio={3 / 4}
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
                    </div>
                    <div className="correction-section">
                        {correctionImage && (
                            <div className="image-container">
                                <img
                                    src={correctionImage}
                                    alt="Correction image"
                                    className="image-base"
                                    style={{ display: isProcessing && !correctionImage ? 'none' : 'block' }}
                                />
                                  <div className="image-overlay">
                                      <img src={outline} alt="Outline" style={{ opacity: 0.5 }} />
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
                                    onError={(e) => {
                                        e.target.src = '';
                                    }}
                                    className="image-base"
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
