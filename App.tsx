
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateContentFromUrl, generateImage, generateCopyFromUrl, generateCopyFromText, editImage, translateCopy } from './services/geminiService';
import { Loader } from './components/Loader';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { LinkIcon } from './components/icons/LinkIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ClipboardIcon } from './components/icons/ClipboardIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { TagIcon } from './components/icons/TagIcon';
import { UploadIcon } from './components/icons/UploadIcon';
import { FilterIcon } from './components/icons/FilterIcon';
import { EditIcon } from './components/icons/EditIcon';
import { SpainFlagIcon } from './components/icons/SpainFlagIcon';
import { UKFlagIcon } from './components/icons/UKFlagIcon';
import { BrazilFlagIcon } from './components/icons/BrazilFlagIcon';

const PRESET_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:5', '4:3', '3:4'] as const;
const PRESET_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#1E90FF', '#FF4500', '#32CD32'];
const FONT_OPTIONS = [
  { name: 'Montserrat', family: "'Montserrat', sans-serif" },
  { name: 'Roboto', family: "'Roboto', sans-serif" },
  { name: 'Playfair Display', family: "'Playfair Display', serif" },
  { name: 'Oswald', family: "'Oswald', sans-serif" },
  { name: 'Lobster', family: "'Lobster', cursive" },
  { name: 'Lato', family: "'Lato', sans-serif" },
  { name: 'Merriweather', family: "'Merriweather', serif" },
];
const GRADIENT_DIRECTIONS = [
  { name: 'To Right', value: 'to right' },
  { name: 'To Bottom', value: 'to bottom' },
  { name: 'To Top Right', value: 'to top right' },
  { name: 'To Bottom Right', value: 'to bottom right' },
  { name: 'To Bottom Left', value: 'to bottom left' },
];
const FILTERS = [
    { name: 'None', value: 'none' },
    { name: 'Clarendon', value: 'contrast(1.2) saturate(1.35) brightness(1.05)' },
    { name: 'Juno', value: 'saturate(1.6) contrast(1.15) brightness(1.1) sepia(0.2) hue-rotate(-10deg)' },
    { name: 'Lark', value: 'brightness(1.2) contrast(0.9) saturate(1.1)' },
    { name: 'Ludwig', value: 'saturate(0.3) contrast(1.05) brightness(1.05)' },
    { name: 'Gingham', value: 'sepia(0.4) contrast(0.9) brightness(1.1)' },
    { name: 'Warm Glow', value: 'sepia(0.3) saturate(1.2) brightness(1.05)' },
    { name: 'Black & White', value: 'grayscale(1) contrast(1.1)' },
    { name: 'High Contrast', value: 'contrast(1.5) saturate(1.5)' },
    { name: 'Vintage', value: 'sepia(0.5) contrast(1.1) brightness(0.9) saturate(1.2)' },
];

type PresetAspectRatio = typeof PRESET_ASPECT_RATIOS[number];
type AspectRatio = PresetAspectRatio | 'custom';
type TitleAlign = 'left' | 'center' | 'right';
type SubheadlinePosition = 'above' | 'below';
type ColorStyleType = 'solid' | 'gradient';
interface TextStyle {
    type: ColorStyleType;
    color1: string;
    color2: string;
    direction: string;
}
type LanguageCode = 'es' | 'en' | 'pt-BR';
type CopyObject = { primaryText: string; headline: string; description: string; keywords: string[]; };
type CopyCache = { [key in LanguageCode]?: CopyObject };

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [bannerTitle, setBannerTitle] = useState<string>('');
  const [bannerSubheadline, setBannerSubheadline] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [copy, setCopy] = useState<CopyObject | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState<boolean>(false);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [isEditingImage, setIsEditingImage] = useState<boolean>(false);
  const [isLoadingCopy, setIsLoadingCopy] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [customDimensions, setCustomDimensions] = useState({ width: 1080, height: 1080 });
  const [showBannerTitle, setShowBannerTitle] = useState<boolean>(true);
  const [textAlign, setTextAlign] = useState<TitleAlign>('center');
  const [titleStyle, setTitleStyle] = useState<TextStyle>({ type: 'solid', color1: '#FFFFFF', color2: '#FFD700', direction: 'to right' });
  const [titleFontFamily, setTitleFontFamily] = useState<string>(FONT_OPTIONS[0].family);
  const [titleFontSize, setTitleFontSize] = useState<number>(64);
  
  const [showSubheadline, setShowSubheadline] = useState<boolean>(true);
  const [subheadlinePosition, setSubheadlinePosition] = useState<SubheadlinePosition>('below');
  const [subheadlineStyle, setSubheadlineStyle] = useState<TextStyle>({ type: 'solid', color1: '#FFFFFF', color2: '#1E90FF', direction: 'to right' });
  const [subheadlineFontFamily, setSubheadlineFontFamily] = useState<string>(FONT_OPTIONS[1].family);
  const [subheadlineFontSize, setSubheadlineFontSize] = useState<number>(32);

  const [logoPosition, setLogoPosition] = useState({ x: 0.98, y: 0.98 }); // Position of bottom-right corner, in percentage
  const [logoScale, setLogoScale] = useState<number>(0.15); // Scale relative to banner width
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 }); // Center of the text block in %
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('none');
  
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('es');
  const [copyCache, setCopyCache] = useState<CopyCache>({});

  const bannerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const textBlockRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; logoX: number; logoY: number; } | null>(null);
  const textDragStartRef = useRef<{ startX: number; startY: number; textX: number; textY: number; } | null>(null);
  const imageDragStartRef = useRef<{ startX: number; startY: number; imageX: number; imageY: number; } | null>(null);


  const handleGeneratePrompt = useCallback(async () => {
    if (!url) {
      setError('Please enter a valid URL.');
      return;
    }
    setError('');
    setIsLoadingPrompt(true);
    setImagePrompt('');
    setBannerTitle('');
    setBannerSubheadline('');
    setImageUrl('');
    setEditPrompt('');
    setTextPosition({ x: 50, y: 50 });
    setLogoUrl(null);
    setCopy(null);

    try {
      const { imagePrompt, bannerTitle, bannerSubheadline } = await generateContentFromUrl(url);
      setImagePrompt(imagePrompt);
      setBannerTitle(bannerTitle);
      setBannerSubheadline(bannerSubheadline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoadingPrompt(false);
    }
  }, [url]);

  const findClosestAspectRatio = (width: number, height: number): PresetAspectRatio => {
    const targetRatio = width / height;
    const ratios: { name: PresetAspectRatio; value: number }[] = [
      { name: '1:1', value: 1 },
      { name: '16:9', value: 16 / 9 },
      { name: '9:16', value: 9 / 16 },
      { name: '4:5', value: 4 / 5 },
      { name: '4:3', value: 4 / 3 },
      { name: '3:4', value: 3 / 4 },
    ];
    
    let closest = ratios[0];
    let minDiff = Math.abs(targetRatio - closest.value);

    for (let i = 1; i < ratios.length; i++) {
        const diff = Math.abs(targetRatio - ratios[i].value);
        if (diff < minDiff) {
            minDiff = diff;
            closest = ratios[i];
        }
    }
    return closest.name;
  };

  const handleGenerateImage = useCallback(async () => {
    if (!imagePrompt) {
      setError('A prompt is required to generate an image.');
      return;
    }
     if (showBannerTitle && !bannerTitle) {
      setError('A banner title is required when "Show on Banner" is checked.');
      return;
    }
     if (showSubheadline && !bannerSubheadline) {
      setError('A subheadline is required when "Show on Banner" is checked for it.');
      return;
    }
    if (aspectRatio === 'custom' && (!customDimensions.width || !customDimensions.height || customDimensions.width <= 0 || customDimensions.height <= 0)) {
        setError('Please enter valid, positive dimensions for the custom aspect ratio.');
        return;
    }
    setError('');
    setIsLoadingImage(true);
    setImageUrl('');
    setEditPrompt('');
    setTextPosition({ x: 50, y: 50 });
    setImagePosition({ x: 50, y: 50 });
    setActiveFilter('none');
    setLogoUrl(null);
    setCopy(null);

    try {
      const apiAspectRatio = aspectRatio === 'custom'
        ? findClosestAspectRatio(customDimensions.width, customDimensions.height)
        : aspectRatio;

      const generatedImageUrl = await generateImage(imagePrompt, apiAspectRatio);
      setImageUrl(generatedImageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the image.');
    } finally {
      setIsLoadingImage(false);
    }
  }, [imagePrompt, bannerTitle, showBannerTitle, bannerSubheadline, showSubheadline, aspectRatio, customDimensions]);

  const handleEditImage = useCallback(async () => {
    if (!imageUrl || !editPrompt.trim()) {
      setError('An image and an edit prompt are required to edit the image.');
      return;
    }
    setError('');
    setIsEditingImage(true);
    try {
      const newImageUrl = await editImage(imageUrl, editPrompt);
      setImageUrl(newImageUrl);
      setEditPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while editing the image.');
    } finally {
      setIsEditingImage(false);
    }
  }, [imageUrl, editPrompt]);

  const handleGenerateCopy = useCallback(async () => {
    if (!url && (!imagePrompt || !bannerTitle)) {
      setError('Either a URL or a prompt and title are needed to generate copy.');
      return;
    }

    setError('');
    setIsLoadingCopy(true);
    setCopy(null);
    setCopyCache({});
    setSelectedLang('es');
    
    try {
      const spanishCopy = url 
        ? await generateCopyFromUrl(url) 
        : await generateCopyFromText(imagePrompt, bannerTitle);
      
      setCopy(spanishCopy);
      setCopyCache({ es: spanishCopy });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while generating copy.');
    } finally {
      setIsLoadingCopy(false);
    }
  }, [url, imagePrompt, bannerTitle]);

  const handleLanguageChange = async (lang: LanguageCode) => {
    if (selectedLang === lang || isTranslating || !copy) return;

    setSelectedLang(lang);

    if (copyCache[lang]) {
      setCopy(copyCache[lang]!);
      return;
    }

    setIsTranslating(true);
    setError('');
    
    try {
      const originalCopy = copyCache.es;
      if (!originalCopy) {
        throw new Error("Original Spanish copy not found for translation.");
      }
      const translated = await translateCopy(originalCopy, lang);
      setCopyCache(prev => ({ ...prev, [lang]: translated }));
      setCopy(translated);
    } catch (err) {
       setError(err instanceof Error ? err.message : `Failed to translate to ${lang}.`);
       setSelectedLang('es'); 
       if(copyCache.es) setCopy(copyCache.es);
    } finally {
      setIsTranslating(false);
    }
  };
  
  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };
  
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoUrl(reader.result as string);
            setLogoPosition({ x: 0.98, y: 0.98 });
            setLogoScale(0.15);
        };
        reader.onerror = () => { setError("Failed to read the logo file."); };
        reader.readAsDataURL(file);
    } else {
        setError("Please upload a valid PNG or JPEG file.");
    }
  };
  
   const handleLogoDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!bannerRef.current || !logoRef.current) return;
    setIsDraggingLogo(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = { startX: clientX, startY: clientY, logoX: logoPosition.x, logoY: logoPosition.y };
  }, [logoPosition]);

  const handleLogoDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingLogo || !dragStartRef.current || !bannerRef.current || !logoRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const bannerRect = bannerRef.current.getBoundingClientRect();
    const logoRect = logoRef.current.getBoundingClientRect();
    
    const dx = (clientX - dragStartRef.current.startX) / bannerRect.width;
    const dy = (clientY - dragStartRef.current.startY) / bannerRect.height;

    let newX = dragStartRef.current.logoX + dx;
    let newY = dragStartRef.current.logoY + dy;
    
    const logoWidthPercent = logoRect.width / bannerRect.width;
    const logoHeightPercent = logoRect.height / bannerRect.height;
    
    newX = Math.max(logoWidthPercent, Math.min(1, newX));
    newY = Math.max(logoHeightPercent, Math.min(1, newY));

    setLogoPosition({ x: newX, y: newY });
  }, [isDraggingLogo]);

  const handleLogoDragEnd = useCallback(() => {
    setIsDraggingLogo(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDraggingLogo) {
      window.addEventListener('mousemove', handleLogoDragMove);
      window.addEventListener('touchmove', handleLogoDragMove);
      window.addEventListener('mouseup', handleLogoDragEnd);
      window.addEventListener('touchend', handleLogoDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleLogoDragMove);
      window.removeEventListener('touchmove', handleLogoDragMove);
      window.removeEventListener('mouseup', handleLogoDragEnd);
      window.removeEventListener('touchend', handleLogoDragEnd);
    };
  }, [isDraggingLogo, handleLogoDragMove, handleLogoDragEnd]);
  
  const handleTextDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!bannerRef.current || !textBlockRef.current) return;
    setIsDraggingText(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    textDragStartRef.current = { startX: clientX, startY: clientY, textX: textPosition.x, textY: textPosition.y };
  }, [textPosition]);

  const handleTextDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingText || !textDragStartRef.current || !bannerRef.current || !textBlockRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const bannerRect = bannerRef.current.getBoundingClientRect();
    const dx = clientX - textDragStartRef.current.startX;
    const dy = clientY - textDragStartRef.current.startY;
    const deltaXPercent = (dx / bannerRect.width) * 100;
    const deltaYPercent = (dy / bannerRect.height) * 100;
    
    let newX = textDragStartRef.current.textX + deltaXPercent;
    let newY = textDragStartRef.current.textY + deltaYPercent;
    
    const textRect = textBlockRef.current.getBoundingClientRect();
    const textWidthPercent = (textRect.width / bannerRect.width) * 100;
    const textHeightPercent = (textRect.height / bannerRect.height) * 100;

    newX = Math.max(textWidthPercent / 2, Math.min(100 - textWidthPercent / 2, newX));
    newY = Math.max(textHeightPercent / 2, Math.min(100 - textHeightPercent / 2, newY));

    setTextPosition({ x: newX, y: newY });
  }, [isDraggingText]);

  const handleTextDragEnd = useCallback(() => {
    setIsDraggingText(false);
    textDragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDraggingText) {
      window.addEventListener('mousemove', handleTextDragMove);
      window.addEventListener('touchmove', handleTextDragMove);
      window.addEventListener('mouseup', handleTextDragEnd);
      window.addEventListener('touchend', handleTextDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleTextDragMove);
      window.removeEventListener('touchmove', handleTextDragMove);
      window.removeEventListener('mouseup', handleTextDragEnd);
      window.removeEventListener('touchend', handleTextDragEnd);
    };
  }, [isDraggingText, handleTextDragMove, handleTextDragEnd]);

  const handleImageDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!imageUrl || isLoadingImage || isEditingImage) return;
    if (logoRef.current && (e.target === logoRef.current || logoRef.current.contains(e.target as Node))) return;
    if (textBlockRef.current && (e.target === textBlockRef.current || textBlockRef.current.contains(e.target as Node))) return;
    
    e.preventDefault();
    setIsDraggingImage(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    imageDragStartRef.current = { startX: clientX, startY: clientY, imageX: imagePosition.x, imageY: imagePosition.y };
  }, [imageUrl, isLoadingImage, isEditingImage, imagePosition]);

  const handleImageDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingImage || !imageDragStartRef.current || !bannerRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const bannerRect = bannerRef.current.getBoundingClientRect();
    const dx = clientX - imageDragStartRef.current.startX;
    const dy = clientY - imageDragStartRef.current.startY;
    const sensitivityX = 100 / bannerRect.width;
    const sensitivityY = 100 / bannerRect.height;
    
    let newX = imageDragStartRef.current.imageX - dx * sensitivityX;
    let newY = imageDragStartRef.current.imageY - dy * sensitivityY;
    
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));

    setImagePosition({ x: newX, y: newY });
  }, [isDraggingImage]);

  const handleImageDragEnd = useCallback(() => {
    setIsDraggingImage(false);
    imageDragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDraggingImage) {
      window.addEventListener('mousemove', handleImageDragMove);
      window.addEventListener('touchmove', handleImageDragMove);
      window.addEventListener('mouseup', handleImageDragEnd);
      window.addEventListener('touchend', handleImageDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleImageDragMove);
      window.removeEventListener('touchmove', handleImageDragMove);
      window.removeEventListener('mouseup', handleImageDragEnd);
      window.removeEventListener('touchend', handleImageDragEnd);
    };
  }, [isDraggingImage, handleImageDragMove, handleImageDragEnd]);

  const handleDownload = useCallback(async () => {
    const bannerElement = bannerRef.current;
    if (!bannerElement || !imageUrl) return;

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const image = new Image();
        image.crossOrigin = 'anonymous';
        // Use a cache-busting query param for edited images to ensure the canvas loads the new version
        image.src = imageUrl.includes('?') ? `${imageUrl}&t=${new Date().getTime()}` : imageUrl;

        image.onload = () => {
            let finalWidth: number, finalHeight: number;
            
            if (aspectRatio === 'custom' && customDimensions.width > 0 && customDimensions.height > 0) {
                finalWidth = customDimensions.width;
                finalHeight = customDimensions.height;
            } else {
                finalWidth = image.naturalWidth;
                finalHeight = image.naturalHeight;
            }

            canvas.width = finalWidth;
            canvas.height = finalHeight;
            
            const canvasRatio = finalWidth / finalHeight;
            const imageRatio = image.naturalWidth / image.naturalHeight;
            let sx = 0, sy = 0, sWidth = image.naturalWidth, sHeight = image.naturalHeight;

            if (imageRatio > canvasRatio) { 
                sWidth = image.naturalHeight * canvasRatio;
                sx = (image.naturalWidth - sWidth) * (imagePosition.x / 100);
            } else if (imageRatio < canvasRatio) { 
                sHeight = image.naturalWidth / canvasRatio;
                sy = (image.naturalHeight - sHeight) * (imagePosition.y / 100);
            }
            
            ctx.filter = activeFilter;
            ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, finalWidth, finalHeight);
            ctx.filter = 'none';
            
            const finalizeDownload = () => {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
              const link = document.createElement('a');
              link.href = dataUrl;
              const sanitizedTitle = bannerTitle.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
              link.download = `${sanitizedTitle || 'banner'}.jpg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }

            const drawTextElements = async () => {
                const scaleFactor = finalWidth / bannerElement.clientWidth;
                const paddingX = finalWidth * 0.05;
                const maxWidth = finalWidth - (paddingX * 2);

                const getTextMetrics = async (text: string, font: string, size: number, weight: number) => {
                    try { await document.fonts.load(`${weight} ${size}px ${font}`); } 
                    catch(e) { console.warn(`Font could not be loaded for canvas: ${font}`, e); }
                    
                    ctx.font = `${weight} ${size}px ${font}`;
                    const words = text.split(' ');
                    let line = '';
                    const lines = [];

                    for(let n = 0; n < words.length; n++) {
                        const testLine = line + words[n] + ' ';
                        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                            lines.push(line.trim());
                            line = words[n] + ' ';
                        } else { line = testLine; }
                    }
                    lines.push(line.trim());
                    
                    const lineHeight = size * 1.2;
                    const totalHeight = (lines.length * lineHeight) - (lineHeight * 0.2);
                    return { lines, lineHeight, totalHeight };
                };
                
                const titleMetrics = showBannerTitle && bannerTitle ? await getTextMetrics(bannerTitle, titleFontFamily, Math.max(16, titleFontSize * scaleFactor), 800) : { lines: [], lineHeight: 0, totalHeight: 0 };
                const subheadlineMetrics = showSubheadline && bannerSubheadline ? await getTextMetrics(bannerSubheadline, subheadlineFontFamily, Math.max(12, subheadlineFontSize * scaleFactor), 500) : { lines: [], lineHeight: 0, totalHeight: 0 };

                const gap = (titleMetrics.totalHeight > 0 && subheadlineMetrics.totalHeight > 0) ? (10 * scaleFactor) : 0;
                const totalBlockHeight = titleMetrics.totalHeight + subheadlineMetrics.totalHeight + gap;
                
                ctx.textBaseline = 'top';
                let blockCenterX = finalWidth * (textPosition.x / 100);
                const blockCenterY = finalHeight * (textPosition.y / 100);
                const blockStartY = blockCenterY - (totalBlockHeight / 2);
                
                const drawText = (lines: string[], lineHeight: number, x: number, y: number, font: string, size: number, weight: number, style: TextStyle, align: TitleAlign, textBlockWidth: number) => {
                    ctx.font = `${weight} ${size}px ${font}`;
                    ctx.textAlign = align;
                    
                    if (style.type === 'gradient') {
                        let grad;
                        const blockXStart = x - (textBlockWidth / 2);
                        const blockXEnd = x + (textBlockWidth / 2);
                        if (style.direction === 'to bottom') grad = ctx.createLinearGradient(0, y, 0, y + (lines.length * lineHeight));
                        else if (style.direction === 'to top right') grad = ctx.createLinearGradient(blockXStart, y + (lines.length * lineHeight), blockXEnd, y);
                        else if (style.direction === 'to bottom right') grad = ctx.createLinearGradient(blockXStart, y, blockXEnd, y + (lines.length * lineHeight));
                        else if (style.direction === 'to bottom left') grad = ctx.createLinearGradient(blockXEnd, y, blockXStart, y + (lines.length * lineHeight));
                        else grad = ctx.createLinearGradient(blockXStart, 0, blockXEnd, 0); // Default to 'to right'
                        
                        grad.addColorStop(0, style.color1);
                        grad.addColorStop(1, style.color2);
                        ctx.fillStyle = grad;
                    } else {
                        ctx.fillStyle = style.color1;
                    }

                    const drawLineWithShadows = (text: string, dx: number, dy: number) => {
                      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'; ctx.shadowBlur = 8 * scaleFactor; ctx.shadowOffsetX = 2 * scaleFactor; ctx.shadowOffsetY = 2 * scaleFactor;
                      ctx.fillText(text, dx, dy);
                      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowBlur = 20 * scaleFactor; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 5 * scaleFactor;
                      ctx.fillText(text, dx, dy);
                      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
                      ctx.fillText(text, dx, dy);
                    };

                    for(let i = 0; i < lines.length; i++) {
                        drawLineWithShadows(lines[i], x, y + (i * lineHeight));
                    }
                };

                const drawElements = () => {
                    const getMaxLineWidth = (lines: string[], font: string, size: number, weight: number): number => {
                        ctx.font = `${weight} ${size}px ${font}`;
                        return Math.max(...lines.map(line => ctx.measureText(line).width), 0);
                    };

                    const titleBlockWidth = showBannerTitle && bannerTitle ? getMaxLineWidth(titleMetrics.lines, titleFontFamily, Math.max(16, titleFontSize * scaleFactor), 800) : 0;
                    const subheadlineBlockWidth = showSubheadline && bannerSubheadline ? getMaxLineWidth(subheadlineMetrics.lines, subheadlineFontFamily, Math.max(12, subheadlineFontSize * scaleFactor), 500) : 0;
                    const textBlockWidth = Math.max(titleBlockWidth, subheadlineBlockWidth);
                    
                    if (textBlockWidth > 0) {
                      const blockLeftEdge = blockCenterX - (textBlockWidth / 2);
                      const blockRightEdge = blockCenterX + (textBlockWidth / 2);
                      if (blockLeftEdge < paddingX) blockCenterX = paddingX + (textBlockWidth / 2);
                      if (blockRightEdge > finalWidth - paddingX) blockCenterX = (finalWidth - paddingX) - (textBlockWidth / 2);
                    }

                    let drawX: number;
                    switch (textAlign) {
                        case 'left': drawX = blockCenterX - (textBlockWidth / 2); break;
                        case 'right': drawX = blockCenterX + (textBlockWidth / 2); break;
                        default: drawX = blockCenterX; break;
                    }

                    const titleY = subheadlinePosition === 'above' && subheadlineMetrics.totalHeight > 0 ? blockStartY + subheadlineMetrics.totalHeight + gap : blockStartY;
                    const subheadlineY = subheadlinePosition === 'above' ? blockStartY : blockStartY + titleMetrics.totalHeight + gap;

                    if (showBannerTitle && bannerTitle) {
                        drawText(titleMetrics.lines, titleMetrics.lineHeight, drawX, titleY, titleFontFamily, Math.max(16, titleFontSize * scaleFactor), 800, titleStyle, textAlign, titleBlockWidth);
                    }
                    if (showSubheadline && bannerSubheadline) {
                        drawText(subheadlineMetrics.lines, subheadlineMetrics.lineHeight, drawX, subheadlineY, subheadlineFontFamily, Math.max(12, subheadlineFontSize * scaleFactor), 500, subheadlineStyle, textAlign, subheadlineBlockWidth);
                    }
                };
                drawElements();
            };

            const drawLogoAndFinalize = () => {
                if (logoUrl) {
                    const logoImage = new Image();
                    logoImage.crossOrigin = 'anonymous';
                    logoImage.src = logoUrl;
                    logoImage.onload = () => {
                        const logoBaseWidth = finalWidth * logoScale;
                        const logoAspectRatio = logoImage.naturalWidth / logoImage.naturalHeight;
                        const logoWidth = logoBaseWidth;
                        const logoHeight = logoBaseWidth / logoAspectRatio;
                        const logoX = finalWidth * logoPosition.x - logoWidth;
                        const logoY = finalHeight * logoPosition.y - logoHeight;

                        ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
                        finalizeDownload();
                    };
                    logoImage.onerror = () => {
                        console.error("Failed to load logo for canvas drawing.");
                        finalizeDownload();
                    };
                } else {
                    finalizeDownload();
                }
            };
            drawTextElements().then(drawLogoAndFinalize);
        };
        image.onerror = () => setError("Failed to load image for download.");
    } catch (err) {
        console.error("Download failed:", err);
        setError("Could not prepare the image for download.");
    }
  }, [imageUrl, bannerTitle, showBannerTitle, textAlign, textPosition, titleStyle, titleFontFamily, titleFontSize, bannerSubheadline, showSubheadline, subheadlinePosition, subheadlineStyle, subheadlineFontFamily, subheadlineFontSize, aspectRatio, customDimensions, logoUrl, logoPosition, logoScale, imagePosition, activeFilter]);

    const getPreviewTextStyle = (style: TextStyle, fontFamily: string, fontSize: number): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            fontFamily,
            fontSize: `${fontSize}px`,
        };
        if (style.type === 'gradient') {
            return {
                ...baseStyle,
                background: `linear-gradient(${style.direction}, ${style.color1}, ${style.color2})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
            };
        }
        return { ...baseStyle, color: style.color1 };
    };

  const isLoading = isLoadingPrompt || isLoadingImage || isLoadingCopy || isEditingImage;
  const aspectRatioClasses: { [key in PresetAspectRatio]: string } = {
    '1:1': 'aspect-square', '16:9': 'aspect-video', '9:16': 'aspect-[9/16]',
    '4:5': 'aspect-[4/5]', '4:3': 'aspect-[4/3]', '3:4': 'aspect-[3/4]',
  };
  
  const previewStyle: React.CSSProperties = {};
  let previewClassName = `relative w-full bg-slate-900/80 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden transition-all duration-300`;

  if (aspectRatio === 'custom' && customDimensions.width > 0 && customDimensions.height > 0) {
      previewStyle.aspectRatio = `${customDimensions.width} / ${customDimensions.height}`;
  } else if (aspectRatio !== 'custom') {
      previewClassName += ` ${aspectRatioClasses[aspectRatio]}`;
  } else {
      previewClassName += ` aspect-square`;
  }

  const renderColorInputs = (style: TextStyle, setStyle: React.Dispatch<React.SetStateAction<TextStyle>>) => (
    <>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-900/80 p-1 border border-slate-700 w-40">
          {(['Solid', 'Gradient'] as const).map(type => (
              <button key={type} type="button" onClick={() => setStyle(s => ({ ...s, type: type.toLowerCase() as ColorStyleType }))} disabled={isLoading} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${style.type === type.toLowerCase() ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>{type}</button>
          ))}
      </div>
      <div className="flex items-center gap-3">
        {style.type === 'solid' ? (
             <div className="flex items-center gap-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                      {PRESET_COLORS.map((color) => (
                          <button key={color} type="button" onClick={() => setStyle(s => ({ ...s, color1: color }))} className={`w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 ${style.color1.toLowerCase() === color.toLowerCase() ? 'border-emerald-400 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-800' : 'border-slate-600'}`} style={{ backgroundColor: color }} aria-label={`Set color to ${color}`} />
                      ))}
                  </div>
                  <div className="relative">
                      <input type="text" value={style.color1} onChange={(e) => setStyle(s => ({ ...s, color1: e.target.value }))} className="w-28 bg-slate-900/80 border border-slate-700 rounded-lg py-1.5 pl-9 pr-2 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="#FFFFFF" />
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded border border-slate-500 pointer-events-none" style={{ backgroundColor: style.color1 }}></div>
                  </div>
              </div>
        ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fade-in">
                <div className="flex items-center gap-2">
                    <input type="color" value={style.color1} onChange={(e) => setStyle(s => ({ ...s, color1: e.target.value }))} className="w-10 h-10 bg-transparent border-none rounded-lg cursor-pointer" aria-label="Gradient start color" />
                    <input type="color" value={style.color2} onChange={(e) => setStyle(s => ({ ...s, color2: e.target.value }))} className="w-10 h-10 bg-transparent border-none rounded-lg cursor-pointer" aria-label="Gradient end color" />
                </div>
                 <select value={style.direction} onChange={(e) => setStyle(s => ({ ...s, direction: e.target.value }))} className="bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                     {GRADIENT_DIRECTIONS.map(dir => <option key={dir.value} value={dir.value}>{dir.name}</option>)}
                 </select>
            </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-pink-500 mb-2">
            Magic Banner Creator
          </h1>
          <p className="text-slate-400 text-lg">
            Generate an AI-powered banner from any article or your own prompt.
          </p>
        </header>

        <main>
          <div className="bg-slate-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">Step 1: Generate Content (Optional)</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste an article URL..." className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors" disabled={isLoading} aria-label="Article URL" />
              </div>
              <button onClick={handleGeneratePrompt} disabled={isLoading} className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100">
                {isLoadingPrompt ? (<><Loader />Generating...</>) : (<><SparklesIcon className="w-5 h-5" />Generate</>)}
              </button>
            </div>
          </div>

          <div className="mt-6 bg-slate-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700">
              <h2 className="text-lg font-semibold text-slate-300 mb-4">Step 2: Customize & Create Banner</h2>
              <div className="space-y-4">
                  <div>
                      <label htmlFor="image-prompt" className="block text-sm font-medium text-slate-400 mb-1">Image Prompt</label>
                      <textarea id="image-prompt" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} className="w-full h-28 bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors" placeholder="A visually descriptive prompt for the AI image generator..." disabled={isLoading} aria-label="Image prompt" />
                  </div>
                  <div>
                     <div className="flex items-center justify-between mb-1">
                        <label htmlFor="banner-title" className="block text-sm font-medium text-slate-400">Banner Title</label>
                        <div className="flex items-center gap-2">
                            <input id="show-title-checkbox" type="checkbox" checked={showBannerTitle} onChange={(e) => setShowBannerTitle(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" disabled={isLoading}/>
                            <label htmlFor="show-title-checkbox" className="text-sm text-slate-400 select-none">Show on Banner</label>
                        </div>
                    </div>
                      <input id="banner-title" type="text" value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors" placeholder="A short, engaging title for the banner..." disabled={isLoading} aria-label="Banner title" />
                  </div>
                   <div>
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="banner-subheadline" className="block text-sm font-medium text-slate-400">Banner Subheadline</label>
                            <div className="flex items-center gap-2">
                                <input id="show-subheadline-checkbox" type="checkbox" checked={showSubheadline} onChange={(e) => setShowSubheadline(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" disabled={isLoading}/>
                                <label htmlFor="show-subheadline-checkbox" className="text-sm text-slate-400 select-none">Show on Banner</label>
                            </div>
                        </div>
                        <input id="banner-subheadline" type="text" value={bannerSubheadline} onChange={(e) => setBannerSubheadline(e.target.value)} className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors" placeholder="A complementary subheadline..." disabled={isLoading} aria-label="Banner subheadline" />
                    </div>
                  {(showBannerTitle || showSubheadline) && (
                    <div className="space-y-4 pt-2 animate-fade-in">
                        {showBannerTitle && (
                          <div className="space-y-4 pt-4 border-t border-slate-700/50">
                             <p className="text-sm font-medium text-slate-300">Title Style</p>
                              <div>
                                  <label className="block text-sm font-medium text-slate-400 mb-2">Text Alignment</label>
                                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-900/80 p-1 border border-slate-700">
                                      {(['Left', 'Center', 'Right'] as const).map((align) => {
                                          const alignValue = align.toLowerCase() as TitleAlign;
                                          return <button key={align} type="button" onClick={() => setTextAlign(alignValue)} disabled={isLoading} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 ${textAlign === alignValue ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`} aria-pressed={textAlign === alignValue}>{align}</button>;
                                      })}
                                  </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Title Color</label>
                                <div className="flex flex-col items-start gap-3">
                                    {renderColorInputs(titleStyle, setTitleStyle)}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-slate-400 mb-2">Font Family</label>
                                      <select value={titleFontFamily} onChange={(e) => setTitleFontFamily(e.target.value)} disabled={isLoading} className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                          {FONT_OPTIONS.map(font => (<option key={font.name} value={font.family} style={{fontFamily: font.family}}>{font.name}</option>))}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-slate-400 mb-2">Font Size (px)</label>
                                      <input type="number" value={titleFontSize} onChange={(e) => setTitleFontSize(parseInt(e.target.value, 10) || 0)} disabled={isLoading} className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="64"/>
                                  </div>
                              </div>
                          </div>
                        )}
                         {showSubheadline && (
                            <div className="space-y-4 pt-4 mt-4 border-t border-slate-700/50">
                                <p className="text-sm font-medium text-slate-300">Subheadline Style</p>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Subheadline Position</label>
                                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-900/80 p-1 border border-slate-700">
                                        {(['Above Title', 'Below Title'] as const).map((pos) => {
                                            const positionValue = pos.split(' ')[0].toLowerCase() as SubheadlinePosition;
                                            return <button key={pos} type="button" onClick={() => setSubheadlinePosition(positionValue)} disabled={isLoading} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 ${subheadlinePosition === positionValue ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`} aria-pressed={subheadlinePosition === positionValue}>{pos}</button>;
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Subheadline Color</label>
                                    <div className="flex flex-col items-start gap-3">
                                      {renderColorInputs(subheadlineStyle, setSubheadlineStyle)}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Font Family</label>
                                        <select value={subheadlineFontFamily} onChange={(e) => setSubheadlineFontFamily(e.target.value)} disabled={isLoading} className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                            {FONT_OPTIONS.map(font => (<option key={font.name} value={font.family} style={{fontFamily: font.family}}>{font.name}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Font Size (px)</label>
                                        <input type="number" value={subheadlineFontSize} onChange={(e) => setSubheadlineFontSize(parseInt(e.target.value, 10) || 0)} disabled={isLoading} className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="32" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                  )}
              </div>
              <div className="mt-6">
                <h3 className="text-md font-semibold text-slate-400 mb-2 text-center">Aspect Ratio</h3>
                <div className="flex justify-center gap-3 flex-wrap" role="group" aria-label="Image aspect ratio">
                    {PRESET_ASPECT_RATIOS.map((ratio) => <button key={ratio} type="button" onClick={() => setAspectRatio(ratio)} disabled={isLoading} className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${aspectRatio === ratio ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'}`} aria-pressed={aspectRatio === ratio}>{ratio}</button>)}
                    <button key="custom" type="button" onClick={() => setAspectRatio('custom')} disabled={isLoading} className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${aspectRatio === 'custom' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'}`} aria-pressed={aspectRatio === 'custom'}>Custom</button>
                </div>
                 {aspectRatio === 'custom' && (
                    <div className="mt-4 flex items-center justify-center gap-2 animate-fade-in">
                        <input type="number" value={customDimensions.width} onChange={(e) => setCustomDimensions({ ...customDimensions, width: parseInt(e.target.value, 10) || 0 })} placeholder="Width" className="w-24 bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors" disabled={isLoading} aria-label="Custom banner width" />
                        <span className="text-slate-500 font-semibold">x</span>
                        <input type="number" value={customDimensions.height} onChange={(e) => setCustomDimensions({ ...customDimensions, height: parseInt(e.target.value, 10) || 0 })} placeholder="Height" className="w-24 bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors" disabled={isLoading} aria-label="Custom banner height" />
                    </div>
                )}
              </div>
              <button onClick={handleGenerateImage} disabled={isLoading || !imagePrompt || (showBannerTitle && !bannerTitle)} className="mt-6 w-full flex items-center justify-center gap-2 bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-pink-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100">
                {isLoadingImage ? (<><Loader />Creating Image...</>) : 'Generate Image'}
              </button>
            </div>
          
          {error && <div className="mt-6 bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-4 text-center" role="alert">{error}</div>}

          {(isLoadingImage || imageUrl) && (
            <div className="mt-6 bg-slate-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700 animate-fade-in">
              <h2 className="text-lg font-semibold text-slate-300 mb-4">Result</h2>
              <div 
                ref={bannerRef} 
                className={`${previewClassName} ${imageUrl && !isLoadingImage && !isEditingImage ? 'cursor-grab' : ''} ${isDraggingImage ? 'active:cursor-grabbing' : ''}`} 
                style={previewStyle}
                onMouseDown={handleImageDragStart}
                onTouchStart={handleImageDragStart}
              >
                {(isLoadingImage || isEditingImage) && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center z-20 backdrop-blur-sm">
                    <Loader size="lg" />
                  </div>
                )}
                {imageUrl && (
                  <>
                    <img 
                      src={imageUrl} 
                      alt="Generated from prompt" 
                      className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-500 ${isEditingImage ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'}`}
                      style={{ 
                        objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                        filter: activeFilter 
                      }}
                    />
                    {(showBannerTitle || showSubheadline) && (
                         <div
                            ref={textBlockRef}
                            className="absolute p-4 w-max max-w-[90%] flex flex-col gap-2 cursor-grab active:cursor-grabbing z-10"
                            style={{
                                left: `${textPosition.x}%`,
                                top: `${textPosition.y}%`,
                                transform: 'translate(-50%, -50%)',
                                textAlign: textAlign,
                                alignItems: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
                            }}
                            onMouseDown={handleTextDragStart}
                            onTouchStart={handleTextDragStart}
                        >
                            {subheadlinePosition === 'above' && showSubheadline && bannerSubheadline && (
                                <p className="font-medium leading-tight" style={{ ...getPreviewTextStyle(subheadlineStyle, subheadlineFontFamily, subheadlineFontSize), textShadow: '0px 1px 3px rgba(0,0,0,0.7), 0px 2px 8px rgba(0,0,0,0.6)' }}>
                                    {bannerSubheadline}
                                </p>
                            )}
                            {showBannerTitle && bannerTitle && (
                                <h3 className={`font-extrabold leading-tight w-full max-w-full break-words`} style={{ ...getPreviewTextStyle(titleStyle, titleFontFamily, titleFontSize), textShadow: '0px 2px 5px rgba(0,0,0,0.7), 0px 5px 20px rgba(0,0,0,0.6)' }}>
                                    {bannerTitle}
                                </h3>
                            )}
                            {subheadlinePosition === 'below' && showSubheadline && bannerSubheadline && (
                                 <p className="font-medium leading-tight" style={{ ...getPreviewTextStyle(subheadlineStyle, subheadlineFontFamily, subheadlineFontSize), textShadow: '0px 1px 3px rgba(0,0,0,0.7), 0px 2px 8px rgba(0,0,0,0.6)' }}>
                                    {bannerSubheadline}
                                </p>
                            )}
                        </div>
                    )}
                     {logoUrl && (
                        <img ref={logoRef} src={logoUrl} alt="Uploaded Logo" className="absolute h-auto cursor-grab active:cursor-grabbing z-10" style={{ width: `${logoScale * 100}%`, left: `calc(${logoPosition.x * 100}% - ${logoRef.current?.offsetWidth ?? 0}px)`, top: `calc(${logoPosition.y * 100}% - ${logoRef.current?.offsetHeight ?? 0}px)` }} onMouseDown={handleLogoDragStart} onTouchStart={handleLogoDragStart} />
                    )}
                  </>
                )}
              </div>
               {imageUrl && !isLoadingImage && (
                 <>
                  <p className="text-center text-sm text-slate-400 mt-4 italic">Tip: Drag the image background, text block, or logo to adjust their positions.</p>
                   <div className="mt-4 border-t border-slate-700 pt-6">
                        <h3 className="text-md font-semibold text-slate-400 mb-3 flex items-center gap-2">
                            <EditIcon className="w-5 h-5" /> In-place Image Editing
                        </h3>
                        <p className="text-sm text-slate-500 mb-3">Describe the change you want to make to the current image.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-grow">
                                <input 
                                    type="text" 
                                    value={editPrompt} 
                                    onChange={(e) => setEditPrompt(e.target.value)} 
                                    placeholder="e.g., 'Make the sky blue' or 'Add a dog'" 
                                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 pl-4 pr-4 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors" 
                                    disabled={isEditingImage} 
                                    aria-label="Image edit prompt" 
                                />
                            </div>
                            <button 
                                onClick={handleEditImage} 
                                disabled={isEditingImage || !editPrompt.trim()} 
                                className="flex items-center justify-center gap-2 bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                            >
                                {isEditingImage ? (<><Loader /> Applying...</>) : (<><SparklesIcon className="w-5 h-5" /> Apply Edit</>)}
                            </button>
                        </div>
                    </div>
                   <div className="mt-4 border-t border-slate-700 pt-6">
                     <h3 className="text-md font-semibold text-slate-400 mb-3 flex items-center gap-2">
                        <FilterIcon className="w-5 h-5" />Apply a Filter
                     </h3>
                     <div className="flex flex-wrap gap-2">
                        {FILTERS.map(filter => (
                            <button key={filter.name} onClick={() => setActiveFilter(filter.value)} className={`px-3 py-1.5 text-sm font-medium rounded-md border-2 transition-all ${activeFilter === filter.value ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'}`}>
                                {filter.name}
                            </button>
                        ))}
                     </div>
                  </div>
                  <div className="mt-4 border-t border-slate-700 pt-6">
                     <h3 className="text-md font-semibold text-slate-400 mb-3">Step 3: Add & Position Logo (Optional)</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/png, image/jpeg" className="hidden" id="logo-upload"/>
                            <label htmlFor="logo-upload" className="flex-grow flex items-center justify-center gap-2 bg-slate-700/80 text-white font-semibold py-3 px-6 rounded-lg hover:bg-slate-700 disabled:bg-slate-600 disabled:cursor-pointer transition-colors duration-300">
                                <UploadIcon className="w-5 h-5" />
                                Upload Logo
                            </label>
                            {logoUrl && (
                                <div className="flex items-center gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-700">
                                    <img src={logoUrl} alt="Logo preview" className="w-10 h-10 object-contain rounded"/>
                                    <button onClick={() => { setLogoUrl(null); if(logoInputRef.current) logoInputRef.current.value = ''; }} className="text-xs text-red-400 hover:text-red-300 font-semibold" aria-label="Remove logo">Remove</button>
                                </div>
                            )}
                        </div>
                        {logoUrl && (
                           <div className="animate-fade-in">
                             <label htmlFor="logo-size" className="block text-sm font-medium text-slate-400 mb-1">Logo Size</label>
                             <input id="logo-size" type="range" min="0.05" max="0.5" step="0.01" value={logoScale} onChange={(e) => setLogoScale(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" disabled={isLoading} />
                           </div>
                        )}
                      </div>
                  </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 border-t border-slate-700 pt-6">
                    <button onClick={handleDownload} className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100" aria-label="Download generated banner image">
                      <DownloadIcon className="w-5 h-5" />Download Image
                    </button>
                    <button onClick={handleGenerateCopy} disabled={isLoading} className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100" aria-label="Generate social media copy for the banner">
                        {isLoadingCopy ? (<><Loader />Generating...</>) : (<><SparklesIcon className="w-5 h-5" />Generate Copy</>)}
                    </button>
                </div>
                </>
              )}
            </div>
          )}
           {copy && !isLoadingCopy && (
            <div className="mt-6 bg-slate-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700 animate-fade-in">
                <h2 className="text-lg font-semibold text-slate-300 mb-2">Generated Copy</h2>
                 <div className="flex items-center gap-4 mb-4">
                    <p className="text-sm text-slate-400">Language:</p>
                    <div className="flex items-center gap-3">
                        {(['es', 'en', 'pt-BR'] as const).map(lang => (
                            <button
                                key={lang}
                                onClick={() => handleLanguageChange(lang)}
                                disabled={isTranslating}
                                className={`w-8 h-8 rounded-full overflow-hidden transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 focus-visible:ring-emerald-500 ${selectedLang === lang ? 'ring-2 ring-emerald-500' : 'opacity-60 hover:opacity-100'}`}
                                aria-label={`Translate to ${lang === 'es' ? 'Spanish' : lang === 'en' ? 'English' : 'Brazilian Portuguese'}`}
                            >
                                {lang === 'es' && <SpainFlagIcon />}
                                {lang === 'en' && <UKFlagIcon />}
                                {lang === 'pt-BR' && <BrazilFlagIcon />}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative">
                    {isTranslating && (
                        <div className="absolute inset-0 bg-slate-800/70 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm">
                            <Loader />
                        </div>
                    )}
                    <div className={`space-y-4 transition-opacity ${isTranslating ? 'opacity-50' : 'opacity-100'}`}>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Primary Text (Caption)</label>
                            <div className="relative">
                                <textarea readOnly value={copy.primaryText} className="w-full h-24 bg-slate-900/80 border border-slate-700 rounded-lg p-3 pr-10 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors resize-none" aria-label="Primary Text" />
                                <button onClick={() => handleCopyToClipboard(copy.primaryText, 'primaryText')} className="absolute top-2 right-2 p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors" aria-label="Copy primary text">
                                    {copiedField === 'primaryText' ? <CheckIcon className="w-5 h-5 text-emerald-400" /> : <ClipboardIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Headline</label>
                            <div className="relative">
                                <input readOnly value={copy.headline} className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 pr-10 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors" aria-label="Headline" />
                                <button onClick={() => handleCopyToClipboard(copy.headline, 'headline')} className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors" aria-label="Copy headline">
                                    {copiedField === 'headline' ? <CheckIcon className="w-5 h-5 text-emerald-400" /> : <ClipboardIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                            <div className="relative">
                                <input readOnly value={copy.description} className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-2 px-3 pr-10 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors" aria-label="Description" />
                                <button onClick={() => handleCopyToClipboard(copy.description, 'description')} className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors" aria-label="Copy description">
                                    {copiedField === 'description' ? <CheckIcon className="w-5 h-5 text-emerald-400" /> : <ClipboardIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}
          {copy && copy.keywords && !isLoadingCopy && (
            <div className="mt-6 bg-slate-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700 animate-fade-in">
                <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <TagIcon className="w-5 h-5" /> Most Relevant Keywords
                </h2>
                 <div className="relative">
                    {isTranslating && (
                        <div className="absolute -inset-4 bg-slate-800/70 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm">
                        </div>
                    )}
                    <div className={`flex flex-wrap gap-3 transition-opacity ${isTranslating ? 'opacity-50' : 'opacity-100'}`}>
                        {copy.keywords.map((keyword, index) => (
                            <div key={index} className="flex items-center bg-slate-700/80 text-slate-300 text-sm font-medium pl-4 pr-2 py-1.5 rounded-full">
                                <span>{keyword}</span>
                                <button onClick={() => handleCopyToClipboard(keyword, keyword)} className="ml-2 p-1 rounded-full text-slate-400 hover:bg-slate-600/50 hover:text-slate-200 transition-colors" aria-label={`Copy keyword: ${keyword}`}>
                                    {copiedField === keyword ? (<CheckIcon className="w-4 h-4 text-emerald-400" />) : (<ClipboardIcon className="w-4 h-4" />)}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}
        </main>
      </div>
       <style>{`
          @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
          input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; background: #34d399; cursor: pointer; border-radius: 50%; }
          input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; background: #34d399; cursor: pointer; border-radius: 50%; }
          input[type="color"] { -webkit-appearance: none; -moz-appearance: none; appearance: none; width: 44px; height: 44px; background-color: transparent; border: none; cursor: pointer; }
          input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
          input[type="color"]::-webkit-color-swatch { border-radius: 0.5rem; border: 2px solid #475569; }
          input[type="color"]::-moz-color-swatch { border-radius: 0.5rem; border: 2px solid #475569; }
        `}</style>
    </div>
  );
};

export default App;
