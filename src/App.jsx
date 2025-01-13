import React, { useState, useRef } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import './App.css';
import outline from './assets/outline.png';

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
    const intelligentCrop = (img) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const width = img.width;
        const height = img.height;
        const data = ctx.getImageData(0, 0, width, height).data;
        const aspectRatio = 3 / 4; // 标准证件照比例

        // 1. 精确检测有效区域
        let topY = height, bottomY = 0, leftX = width, rightX = 0;
        for (let y = 0; y < height; y++) {
            let rowHasContent = false;
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const alpha = data[index + 3];
                if (alpha > 10) {
                    rowHasContent = true;
                    leftX = Math.min(leftX, x);
                    rightX = Math.max(rightX, x);
                }
            }
            if (rowHasContent) {
                topY = Math.min(topY, y);
                bottomY = Math.max(bottomY, y);
            }
        }

        // 2. 计算人像实际尺寸
        const personWidth = rightX - leftX;
        const personHeight = bottomY - topY;

        // 3. 计算推荐裁剪高度 (更精确的头部区域)
        const recommendedHeadHeight = Math.min(personHeight * 0.5, height * 0.6);
        const cropHeight = recommendedHeadHeight * 1.5; // 留出更多空间

        // 4. 计算裁剪宽度(严格保持3:4比例)
        const cropWidth = cropHeight * aspectRatio;

        // 5. 计算裁剪起始位置(居中)
        const cropTop = Math.max(0, topY - (cropHeight - recommendedHeadHeight) / 2);
        const cropLeft = Math.max(0, leftX + (personWidth - cropWidth) / 2);

        // 6. 安全校验
        const finalCropTop = Math.min(cropTop, height - cropHeight);
        const finalCropLeft = Math.min(cropLeft, width - cropWidth);

        console.log('Intelligent Crop Precise Details:', {
            imageSize: `${width}x${height}`,
            personArea: {
                top: topY,
                bottom: bottomY,
                left: leftX,
                right: rightX,
                width: personWidth,
                height: personHeight
            },
            cropDetails: {
                recommendedHeadHeight,
                cropHeight,
                cropWidth,
                cropTop: finalCropTop,
                cropLeft: finalCropLeft
            }
        });

        return {
            left: finalCropLeft,
            top: finalCropTop,
            width: cropWidth,
            height: cropHeight
        };
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setImage(null);
            setProcessedImage(null);
            setCroppedImage(null);
            setIsProcessing(true);
            setProcessingMessage('Processing image');
            setShowSuccessMessage(false);
            setImageKey((prevKey) => prevKey + 1);
            setCorrectionImage(null);


            const reader = new FileReader();

            return new Promise((resolve, reject) => {
                reader.onloadend = () => {
                    const safeDataURL = reader.result.startsWith('data:image')
                        ? reader.result
                        : `data:image/png;base64,${reader.result}`;

                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);

                        const finalDataURL = canvas.toDataURL('image/png');
                        setProcessedImage(finalDataURL);
                        setImage(finalDataURL);
                        setCroppedImage(finalDataURL);

                        setTimeout(() => {
                            if (cropperRef.current?.cropper) {
                                const cropper = cropperRef.current.cropper;
                                const autoCropData = intelligentCrop(img);
                                console.log('Auto crop data:', autoCropData);

                                const imageData = cropper.getImageData();
                                const canvasData = cropper.getCanvasData();

                                // 计算缩放比例
                                const scaleX = canvasData.naturalWidth / imageData.naturalWidth;
                                const scaleY = canvasData.naturalHeight / imageData.naturalHeight;

                                // 将原始坐标转换为cropper组件内部的坐标
                                const scaledCropLeft = autoCropData.left * scaleX;
                                const scaledCropTop = autoCropData.top * scaleY;
                                const scaledCropWidth = autoCropData.width * scaleX;
                                const scaledCropHeight = autoCropData.height * scaleY;


                                cropper.setCropBoxData({
                                    left: scaledCropLeft,
                                    top: scaledCropTop,
                                    width: scaledCropWidth,
                                    height: scaledCropHeight
                                });


                                console.log('Cropper crop box data after set:', cropper.getCropBoxData());
                            }
                        }, 100);

                        setProcessingMessage('Processing complete');
                        setShowSuccessMessage(true);

                        setTimeout(() => {
                            setShowSuccessMessage(false);
                        }, 3000);

                        resolve();
                    };

                    img.onerror = () => {
                        setIsProcessing(false);
                        reject(new Error('Image loading failed'));
                    };

                    img.src = safeDataURL;
                };

                reader.onerror = () => {
                    setIsProcessing(false);
                    reject(new Error('File reading failed'));
                };

                reader.readAsDataURL(file);
            });

        } catch (error) {
            console.error('Image processing error:', error);
            setProcessingMessage(error.message || 'Processing failed');
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
            setCorrectionImage(croppedImageDataURL);

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
            const croppedCanvas = cropper.getCroppedCanvas({
                width: cropper.getCroppedCanvas().width,
                height: cropper.getCroppedCanvas().height
            });
           
            const canvas = document.createElement('canvas');
            canvas.width = croppedCanvas.width;
            canvas.height = croppedCanvas.height;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(croppedCanvas, 0, 0);

            const newImageWithBackground = canvas.toDataURL('image/png');
             setCorrectionImage(newImageWithBackground);
            setCroppedImage(newImageWithBackground);
             
            // 重新计算裁剪框位置
            const img = new Image();
            img.onload = () => {
                const autoCropData = intelligentCrop(img);
                const imageData = cropper.getImageData();
                const canvasData = cropper.getCanvasData();
                const scaleX = canvasData.naturalWidth / imageData.naturalWidth;
                const scaleY = canvasData.naturalHeight / imageData.naturalHeight;
                const scaledCropLeft = autoCropData.left * scaleX;
                const scaledCropTop = autoCropData.top * scaleY;
                const scaledCropWidth = autoCropData.width * scaleX;
                const scaledCropHeight = autoCropData.height * scaleY;

                cropper.setCropBoxData({
                    left: scaledCropLeft,
                    top: scaledCropTop,
                    width: scaledCropWidth,
                    height: scaledCropHeight
                });
            };
            img.src = newImageWithBackground;
        } catch (error) {
            console.error('Error changing background:', error);
            setProcessingMessage('Failed to change background, please try again');
            setTimeout(() => {
                setProcessingMessage('');
            }, 3000);
        } finally {
            setIsProcessing(false);
        }
    };


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
                           autoCropArea={1}  // 使用完整图像区域
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
