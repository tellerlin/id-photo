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
    const [imageKey, setImageKey] = useState(0);
    const [correctionImage, setCorrectionImage] = useState(null);

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
                setImage(null);
                setProcessedImage(null);
                setCroppedImage(null);
                setIsProcessing(true);
                setProcessingMessage('Processing image');
                setShowSuccessMessage(false);
                setImageKey((prevKey) => prevKey + 1);
                setCorrectionImage(null);

                const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
                if (!validTypes.includes(file.type)) {
                    throw new Error('Unsupported file type');
                }

                const blob = await removeBackground(file);
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

                    reader.readAsDataURL(blob);
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
        }
    };

    const handleCropChange = () => {
        if (!cropperRef.current?.cropper || !processedImage) return;

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
        if (!processedImage || !croppedImage) return;

        try {
            setIsProcessing(true);
            setProcessingMessage('Changing background color');
            setBackgroundColor(color);

            const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
                width: cropperRef.current.cropper.getCroppedCanvas().width,
                height: cropperRef.current.cropper.getCroppedCanvas().height
            });

            const canvas = document.createElement('canvas');
            canvas.width = croppedCanvas.width;
            canvas.height = croppedCanvas.height;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(croppedCanvas, 0, 0);

            const newImageWithBackground = canvas.toDataURL('image/png');
            setCroppedImage(newImageWithBackground);

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

    return (
        <div className="app">
            <header className="header">
                <h1>ID Photo Generator</h1>
                <p>Create professional ID photos with automatic background removal</p>
            </header>
           
             <div className="process-steps">
                <p><strong>Process Steps:</strong> Upload Photo - Crop Photo - Select Background - Download Photo</p>
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
                            style={{ height: 400, width: '100%' }}
                            aspectRatio={1/1}
                            guides={true}
                            ref={cropperRef}
                            zoomable={false}
                            zoomOnWheel={false}
                            crop={handleCropChange}
                        />
                    </div>

                       <div className="correction-section">
                        {correctionImage && (
                            <div className="correction-image-container">
                                <img
                                    src={correctionImage}
                                    alt="Correction image"
                                    className="correction-base-image"
                                    style={{ display: isProcessing && !correctionImage ? 'none' : 'block' }}
                                />
                                  <div className="correction-overlay">
                                        <img src="/outline.png" alt="Outline" style={{ opacity: 0.5 }} />
                                  </div>
                            </div>
                        )}
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
