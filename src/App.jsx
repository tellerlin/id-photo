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
        // 日志组
        console.group('Intelligent Crop Detailed Analysis');
        
        // 基础图像信息日志
        console.log('Image Original Details:', {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            aspectRatio: img.naturalWidth / img.naturalHeight
        });


        // 人体区域分析
        const personArea = {
            top: 114,    // 从之前日志获取
            bottom: 1571,
            left: 99,
            right: 1215,
            width: 1116,
            height: 1457  // bottom - top
        };


        // 计算人体区域比例
        const personAreaRatio = {
            verticalPosition: personArea.top / img.naturalHeight,
            horizontalPosition: personArea.left / img.naturalWidth,
            personHeightRatio: (personArea.bottom - personArea.top) / img.naturalHeight
        };
        console.log('Person Area Ratio:', personAreaRatio);


        // 证件照标准比例配置
        const PHOTO_RATIOS = {
            '1inch': { width: 3, height: 4 },   // 1英寸
            '2inch': { width: 4, height: 6 },   // 2英寸
            'passport': { width: 3, height: 4 } // 护照
        };


        // 选择默认比例
        const selectedRatio = PHOTO_RATIOS['passport'];
        const targetRatio = selectedRatio.width / selectedRatio.height;


        // 动态计算裁剪尺寸
        const recommendedWidth = img.naturalWidth * 0.6; // 原图60%宽度
        const recommendedHeight = recommendedWidth / targetRatio;


        // 垂直位置优化
        const verticalOffset = personArea.top + (personArea.height * 0.3);
        
        // 水平居中计算
        const horizontalOffset = (img.naturalWidth - recommendedWidth) / 2;


        const cropData = {
            left: horizontalOffset,
            top: verticalOffset,
            width: recommendedWidth,
            height: recommendedHeight
        };


        // 安全边界检查
        cropData.left = Math.max(0, Math.min(cropData.left, img.naturalWidth - cropData.width));
        cropData.top = Math.max(0, Math.min(cropData.top, img.naturalHeight - cropData.height));


        // 详细日志输出
        console.log('Recommended Crop Configuration:', {
            ratioUsed: `${selectedRatio.width}:${selectedRatio.height}`,
            cropDetails: cropData,
            safetyChecks: {
                withinImageWidth: cropData.left + cropData.width <= img.naturalWidth,
                withinImageHeight: cropData.top + cropData.height <= img.naturalHeight
            }
        });


        console.groupEnd();


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
                                
                                // 智能裁剪
                                const autoCropData = intelligentCrop(img);
                                console.log('Auto Crop Recommendation:', autoCropData);
    
    
                                // 获取图像和画布数据
                                const imageData = cropper.getImageData();
                                const canvasData = cropper.getCanvasData();
    
    
                                // 计算缩放比例
                                const scaleX = canvasData.naturalWidth / imageData.naturalWidth;
                                const scaleY = canvasData.naturalHeight / imageData.naturalHeight;
    
    
                                // 转换裁剪坐标
                                const scaledCropData = {
                                    left: autoCropData.left * scaleX,
                                    top: autoCropData.top * scaleY,
                                    width: autoCropData.width * scaleX,
                                    height: autoCropData.height * scaleY
                                };
    
    
                                // 设置裁剪框
                                cropper.setCropBoxData(scaledCropData);
    
    
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
