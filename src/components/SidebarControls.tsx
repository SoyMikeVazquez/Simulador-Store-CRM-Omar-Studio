'use client';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload,
  Trash2,
  Image,
  Sparkles,
  Download,
  HelpCircle,
  Box,
  Wind,
  Info,
  Sun,
  CheckCircle2,
  ShoppingCart,
  Plus,
  Minus,
  Send,
  MessageCircle,
  X,
  Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { sendUserRegistrationOwnerNotification } from '@/lib/resend';
import { ContainerType, ProductType, MinoxidilSize, PowderSize, AfterShaveSize } from '@/app/page';

interface SidebarControlsProps {
  productType: ProductType;
  setProductType: (type: ProductType) => void;
  containerType: ContainerType;
  setContainerType: (type: ContainerType) => void;
  lidLabelUrl: string;
  setLidLabelUrl: (url: string) => void;
  sideLabelUrl: string;
  setSideLabelUrl: (url: string) => void;
  
  // Wax settings
  hasWax: boolean;
  setHasWax: (has: boolean) => void;
  lidOpen: boolean;
  setLidOpen: (open: boolean) => void;
  waxColor: string;
  setWaxColor: (color: string) => void;
  waxRoughness: number;
  setWaxRoughness: (roughness: number) => void;
  
  // Sizes
  minoxidilSize: MinoxidilSize;
  setMinoxidilSize: (size: MinoxidilSize) => void;
  powderSize: PowderSize;
  setPowderSize: (size: PowderSize) => void;
  afterShaveSize: AfterShaveSize;
  setAfterShaveSize: (size: AfterShaveSize) => void;

  // Scene lighting settings
  envBrightness: number;
  setEnvBrightness: (val: number) => void;
  accentLightColor: string;
  setAccentLightColor: (val: string) => void;
}

const WATER_BASED_WAXES = [
  { name: 'Rojo', color: '#ef4444' },
  { name: 'Rosa', color: '#ec4899' },
  { name: 'Naranja', color: '#f97316' },
  { name: 'Morado', color: '#a855f7' },
  { name: 'Amarillo', color: '#eab308' },
  { name: 'Azul rey', color: '#2563eb' },
  { name: 'Azul turquesa', color: '#06b6d4' },
  { name: 'Verde', color: '#10b981' },
];

export default function SidebarControls({
  productType,
  setProductType,
  containerType,
  setContainerType,
  lidLabelUrl,
  setLidLabelUrl,
  sideLabelUrl,
  setSideLabelUrl,
  hasWax,
  setHasWax,
  lidOpen,
  setLidOpen,
  waxColor,
  setWaxColor,
  waxRoughness,
  setWaxRoughness,
  minoxidilSize,
  setMinoxidilSize,
  powderSize,
  setPowderSize,
  afterShaveSize,
  setAfterShaveSize,
  envBrightness,
  setEnvBrightness,
  accentLightColor,
  setAccentLightColor,
}: SidebarControlsProps) {
  const router = useRouter();
  const lidFileInputRef = useRef<HTMLInputElement>(null);
  const sideFileInputRef = useRef<HTMLInputElement>(null);

  const [dragLidActive, setDragLidActive] = useState(false);
  const [dragSideActive, setDragSideActive] = useState(false);

  const [uploadedLidFile, setUploadedLidFile] = useState<{ file: File; name: string; size: string } | null>(null);
  const [uploadedSideFile, setUploadedSideFile] = useState<{ file: File; name: string; size: string } | null>(null);

  const [waxFormula, setWaxFormula] = useState<'none' | 'mate' | 'water'>(
    !hasWax ? 'none' : waxColor === '#ffffff' || waxColor === '#f3f4f6' ? 'mate' : 'water'
  );

  const [designMode, setDesignMode] = useState<'full' | 'logo'>('full');
  const [uploadedLogoFile, setUploadedLogoFile] = useState<{ file: File; name: string; size: string } | null>(null);
  const [uploadedLidLogoFile, setUploadedLidLogoFile] = useState<{ file: File; name: string; size: string } | null>(null);


  const [quantity, setQuantity] = useState<number>(100);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);

  // Client Email states for Resend Integration
  const [clientEmail, setClientEmail] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Prospecto states
  const [prospectoInfo, setProspectoInfo] = useState<{ nombre: string; email: string; telefono: string } | null>(null);
  const [showProspectoModal, setShowProspectoModal] = useState(false);
  const [pendingFileAction, setPendingFileAction] = useState<(() => void) | null>(null);
  const [pendingUploadFile, setPendingUploadFile] = useState<{ file: File; type: 'tapa' | 'cuerpo' | 'logo' } | null>(null);
  const [uploadedFilesUrls, setUploadedFilesUrls] = useState<Record<string, string>>({});
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const executeOrShowModal = (
    action: () => void,
    fileToUpload?: { file: File; type: 'tapa' | 'cuerpo' | 'logo' }
  ) => {
    if (!prospectoInfo) {
      setPendingFileAction(() => action);
      if (fileToUpload) setPendingUploadFile(fileToUpload);
      setShowProspectoModal(true);
    } else {
      action();
      // If they are already a prospect, we upload immediately in the background
      if (fileToUpload) {
        const fileName = `${fileToUpload.type}_${Date.now()}_${fileToUpload.file.name}`;
        supabase.storage.from('eriquetas').upload(fileName, fileToUpload.file).then(({ data }) => {
          if (data) {
            const { data: publicUrlData } = supabase.storage.from('eriquetas').getPublicUrl(fileName);
            console.log("Archivo subido en segundo plano:", publicUrlData.publicUrl);
            const newUrls = { ...uploadedFilesUrls, [fileToUpload.type]: publicUrlData.publicUrl };
            setUploadedFilesUrls(newUrls);
            // Actualizar fila del prospecto
            supabase.from('prospectos').update({ archivos: newUrls }).eq('email', prospectoInfo.email).then();
          }
        });
      }
    }
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadEmail) return;
    setIsSubmittingLead(true);
    try {
      // Subir imágenes al bucket "etiquetas" usando el archivo pendiente (si existe)
      let publicUrl = null;

      if (pendingUploadFile) {
        const fileName = `${pendingUploadFile.type}_${Date.now()}_${pendingUploadFile.file.name}`;
        const { data } = await supabase.storage.from('eriquetas').upload(fileName, pendingUploadFile.file);
        if (data) {
          const { data: publicUrlData } = supabase.storage.from('eriquetas').getPublicUrl(fileName);
          publicUrl = publicUrlData.publicUrl;
        }
      }

      const archivosPayload: Record<string, string> = { ...uploadedFilesUrls };
      if (publicUrl && pendingUploadFile) {
        archivosPayload[pendingUploadFile.type] = publicUrl;
        setUploadedFilesUrls(archivosPayload);
      }

      let { error } = await supabase.from('prospectos').insert([{ 
        nombre: leadName, 
        email: leadEmail,
        phone: leadPhone,
        archivos: Object.keys(archivosPayload).length > 0 ? archivosPayload : null
      }]);
      if (error && error.message && error.message.includes('archivos')) {
        const retryRes = await supabase.from('prospectos').insert([{ nombre: leadName, email: leadEmail, phone: leadPhone }]);
        error = retryRes.error;
      }
      if (error) console.error("Error inserting prospecto:", error);

      // Enviar correo solo de aviso al propietario de la barbería vía Resend
      sendUserRegistrationOwnerNotification({
        userName: leadName,
        userEmail: leadEmail,
        phone: leadPhone,
        source: 'Simulador 3D (Registro de Prospecto)',
        details: publicUrl ? `Imagen subida (${pendingUploadFile?.type}): ${publicUrl}` : undefined
      }).catch((emailErr) => console.warn("Error al enviar aviso por correo al propietario:", emailErr));
      
      setProspectoInfo({ nombre: leadName, email: leadEmail, telefono: leadPhone });
      setShowProspectoModal(false);
      
      if (pendingFileAction) {
        pendingFileAction();
        setPendingFileAction(null);
      }
      setPendingUploadFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const currentMaterial: 'alum' | 'pet' = containerType.startsWith('pet_') ? 'pet' : 'alum';
  const currentAlumColor: 'black' | 'silver' = containerType.startsWith('alum_silver') ? 'silver' : 'black';
  const currentSize: '150' | '250' = containerType.endsWith('_250') ? '250' : '150';

  const handleSendEmailOrder = async () => {
    if (!clientEmail || !clientEmail.includes('@')) {
      setEmailError('Ingresa un correo electrónico válido');
      return;
    }
    setEmailError(null);
    setIsSendingEmail(true);

    try {
      let imageBase64 = '';
      const canvas = document.querySelector('canvas');
      if (canvas) {
        imageBase64 = canvas.toDataURL('image/png');
      }

      const finalProductName = productType === 'wax' 
        ? `${!hasWax || waxFormula === 'none' ? 'Envase Vacío' : waxFormula === 'mate' ? 'Cera Mate' : 'Cera Base Agua'} ${currentMaterial === 'alum' ? '150g' : currentSize + 'g'} (${currentMaterial === 'alum' ? (currentAlumColor === 'black' ? 'Aluminio Negro' : 'Aluminio Gris') : 'PET Transparente'})`
        : productType === 'minoxidil' 
        ? `Minoxidil 5% (${minoxidilSize})`
        : productType === 'texture_powder'
        ? `Polvo de Textura ${powderSize} (Envase Negro)`
        : `After Shave ${afterShaveSize}`;
        
      // Intentar subir el render 3D al bucket de etiquetas para guardarlo en el pedido
      // Intentar subir el render 3D al bucket de eriquetas para guardarlo en el pedido
      let render3dUrl = null;
      if (imageBase64) {
        try {
          const fetchRes = await fetch(imageBase64);
          const blob = await fetchRes.blob();
          const fileName = `render3d_${Date.now()}.png`;
          const { data: uploadData } = await supabase.storage.from('eriquetas').upload(fileName, blob);
          if (uploadData) {
            const { data: publicUrlData } = supabase.storage.from('eriquetas').getPublicUrl(fileName);
            render3dUrl = publicUrlData.publicUrl;
          }
        } catch (e) {
          console.warn('Could not upload 3D render:', e);
        }
      }

      const payloadData: any = {
        cliente_nombre: prospectoInfo ? prospectoInfo.nombre : 'Cliente 3D',
        cliente_email: clientEmail,
        telefono: 'N/A',
        direccion: 'N/A',
        requiere_factura: false,
        iva: 0,
        monto_total: 0, // Pendiente de cotización formal
        estado: 'carrito',
        archivos: { ...uploadedFilesUrls, ...(render3dUrl ? { render3d: render3dUrl } : {}) },
        articulos: [{
          cantidad: quantity,
          nombre: finalProductName,
          precio_unitario: 0,
          total: 0
        }]
      };

      let { error: dbError } = await supabase.from('pedidos').insert([payloadData]);
      if (dbError && dbError.message && dbError.message.includes('archivos')) {
        delete payloadData.archivos;
        const retryRes = await supabase.from('pedidos').insert([payloadData]);
        dbError = retryRes.error;
      }
      if (dbError) console.error("Error saving 3D order to Supabase:", dbError);

      // Prepare FormData for FormSubmit CORS endpoint (Static Export Compatible)
      const formData = new FormData();
      formData.append('_subject', `🚀 Cotización de Pedido 3D (${quantity} u) - Omar Labs Studio`);
      formData.append('_replyto', clientEmail);
      formData.append('_cc', 'barbersfc@omarstudio.com.mx');
      formData.append('_captcha', 'false');
      formData.append('_template', 'table');
      formData.append('Cliente_Email', clientEmail);
      formData.append('Producto', finalProductName);
      formData.append('Cantidad_Unidades', `${quantity} Unidades`);

      if (imageBase64) {
        try {
          const fetchRes = await fetch(imageBase64);
          const blob = await fetchRes.blob();
          formData.append('Render_3D_Mockup.png', blob, `mockup-3d-simulacion-${Date.now()}.png`);
        } catch (e) {
          console.warn('Could not attach image blob:', e);
        }
      }

      const res = await fetch('https://formsubmit.co/ajax/admin@omarstudio.com.mx', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok || data.success === 'true' || data.success === true) {
        setEmailSuccess(true);
      } else {
        throw new Error(data.message || 'Error al procesar la cotización');
      }
      setIsSendingEmail(false);
    } catch (err: any) {
      console.error(err);
      setEmailError('Error al enviar el correo. Verifica tu conexión e intentalo de nuevo.');
      setIsSendingEmail(false);
    }
  };

  const handleMaterialSelect = (mat: 'alum' | 'pet') => {
    if (mat === 'pet') {
      setContainerType(currentSize === '250' ? 'pet_clear_250' : 'pet_clear_150');
    } else {
      // Aluminum only has 150g presentation
      const base = currentAlumColor === 'silver' ? 'alum_silver' : 'alum_black';
      setContainerType(`${base}_150` as ContainerType);
    }
  };

  const handleSizeSelect = (sz: '150' | '250') => {
    if (currentMaterial === 'pet') {
      setContainerType(sz === '250' ? 'pet_clear_250' : 'pet_clear_150');
    } else {
      const base = currentAlumColor === 'silver' ? 'alum_silver' : 'alum_black';
      setContainerType(`${base}_150` as ContainerType);
    }
  };

  const handleAlumColorSelect = (col: 'black' | 'silver') => {
    const base = col === 'silver' ? 'alum_silver' : 'alum_black';
    setContainerType(`${base}_150` as ContainerType);
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as ProductType;
    setProductType(type);
    
    const wasLogoUploaded = !!uploadedLidLogoFile;
    if (wasLogoUploaded) {
      setUploadedLidLogoFile(null);
    }

    if (type === 'wax' || type === 'texture_powder') {
      if (!uploadedLidFile && (lidLabelUrl === './default_spray_label.png' || wasLogoUploaded)) {
        setLidLabelUrl('./default_label.png');
      }
      if (!uploadedSideFile && (sideLabelUrl === './default_spray_label.png' || wasLogoUploaded)) {
        setSideLabelUrl('./default_side_label.png');
      }
    } else {
      if (!uploadedSideFile && (sideLabelUrl === './default_label.png' || sideLabelUrl === './default_side_label.png' || wasLogoUploaded)) {
        setSideLabelUrl('./default_spray_label.png');
      }
    }
  };

  const handleLidFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      executeOrShowModal(() => {
        setLidLabelUrl(url);
        setUploadedLidFile({ file, name: file.name, size: formatBytes(file.size) });
      }, { file, type: 'tapa' });
    }
    e.target.value = '';
  };

  const handleSideFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      executeOrShowModal(() => {
        setSideLabelUrl(url);
        setUploadedSideFile({ file, name: file.name, size: formatBytes(file.size) });
      }, { file, type: 'cuerpo' });
    }
    e.target.value = '';
  };

  const generateCompositeLabel = (logoUrl: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fill background black as fallback
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 2048, 512);

    const bgImage = new window.Image();
    bgImage.src = '/productos/plantilla_etiqueta.jpg'; // Changed to .jpg
    bgImage.onload = () => {
      ctx.drawImage(bgImage, 0, 0, 2048, 512);
      drawLogo(logoUrl, ctx, canvas);
    };
    bgImage.onerror = () => {
      // If template not found, just use black background and draw logo
      drawLogo(logoUrl, ctx, canvas);
    };
  };

  const drawLogo = (logoUrl: string, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const logoImg = new window.Image();
    logoImg.src = logoUrl;
    logoImg.onload = () => {
      // center the logo
      const maxWidth = 600; // Optimal size for front face
      const maxHeight = 320;
      let logoWidth = logoImg.width;
      let logoHeight = logoImg.height;
      
      // Calculate initial uniform scaling
      const ratio = Math.min(maxWidth / logoWidth, maxHeight / logoHeight);
      logoWidth = logoWidth * ratio;
      logoHeight = logoHeight * ratio;
      
      // SQUASH HORIZONTALLY: The 3D cylinder stretches the 2048x512 texture horizontally.
      // Comprimiendo el ancho a la mitad, se verá cuadrado 1:1 en el modelo 3D.
      logoWidth = logoWidth * 0.5;
      
      const x = (2048 - logoWidth) / 2;
      const y = (512 - logoHeight) / 2;
      
      ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
      
      const compositeUrl = canvas.toDataURL('image/png');
      setSideLabelUrl(compositeUrl);
    };
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      executeOrShowModal(() => {
        setUploadedLogoFile({ file, name: file.name, size: formatBytes(file.size) });
        generateCompositeLabel(url);
      }, { file, type: 'logo' });
    }
  };

  const generateCompositeLidLabel = (logoUrl: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1024, 1024);

    const bgImage = new window.Image();
    bgImage.src = '/productos/plantilla_tapa.jpg';
    bgImage.onload = () => {
      ctx.drawImage(bgImage, 0, 0, 1024, 1024);
      drawLidLogo(logoUrl, ctx, canvas);
    };
    bgImage.onerror = () => {
      drawLidLogo(logoUrl, ctx, canvas);
    };
  };

  const drawLidLogo = (logoUrl: string, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const logoImg = new window.Image();
    logoImg.src = logoUrl;
    logoImg.onload = () => {
      const maxWidth = 500; // Half of the 1024 canvas
      const maxHeight = 500;
      let logoWidth = logoImg.width;
      let logoHeight = logoImg.height;
      
      const ratio = Math.min(maxWidth / logoWidth, maxHeight / logoHeight);
      logoWidth = logoWidth * ratio;
      logoHeight = logoHeight * ratio;
      
      const x = (1024 - logoWidth) / 2;
      const y = (1024 - logoHeight) / 2;
      
      ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
      
      const compositeUrl = canvas.toDataURL('image/png');
      setLidLabelUrl(compositeUrl);
    };
  };

  const handleLidLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      executeOrShowModal(() => {
        setUploadedLidLogoFile({ file, name: file.name, size: formatBytes(file.size) });
        generateCompositeLidLabel(url);
        generateCompositeLabel(url); // Unifica la etiqueta del cuerpo también
      }, { file, type: 'logo' });
    }
  };

  const handleDragLid = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragLidActive(true);
    else if (e.type === 'dragleave') setDragLidActive(false);
  };

  const handleDropLid = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragLidActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      executeOrShowModal(() => {
        setLidLabelUrl(url);
        setUploadedLidFile({ file, name: file.name, size: formatBytes(file.size) });
      }, { file, type: 'tapa' });
    }
  };

  const handleDragSide = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragSideActive(true);
    else if (e.type === 'dragleave') setDragSideActive(false);
  };

  const handleDropSide = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragSideActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      executeOrShowModal(() => {
        setSideLabelUrl(url);
        setUploadedSideFile({ file, name: file.name, size: formatBytes(file.size) });
      }, { file, type: 'cuerpo' });
    }
  };

  const handleCapture = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const flash = document.createElement('div');
      flash.style.position = 'fixed';
      flash.style.top = '0';
      flash.style.left = '0';
      flash.style.width = '100vw';
      flash.style.height = '100vh';
      flash.style.backgroundColor = '#ffffff';
      flash.style.opacity = '0.8';
      flash.style.zIndex = '99999';
      flash.style.pointerEvents = 'none';
      flash.style.transition = 'opacity 0.4s ease';
      document.body.appendChild(flash);
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => document.body.removeChild(flash), 500);
      }, 50);
      const link = document.createElement('a');
      link.download = `mockup-${productType}-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleWhatsAppOrder = () => {
    const finalProductName = productType === 'wax' 
      ? `${!hasWax || waxFormula === 'none' ? 'Envase Vacío' : waxFormula === 'mate' ? 'Cera Mate' : 'Cera Base Agua'} ${currentMaterial === 'alum' ? '150g' : currentSize + 'g'} (${currentMaterial === 'alum' ? (currentAlumColor === 'black' ? 'Aluminio Negro' : 'Aluminio Gris') : 'PET Transparente'})`
      : productType === 'minoxidil' 
      ? `Minoxidil 5% (${minoxidilSize})`
      : productType === 'texture_powder'
      ? `Polvo de Textura ${powderSize} (Envase Negro)`
      : `After Shave ${afterShaveSize}`;

    const message = `*SOLICITUD DE PEDIDO - OMAR LABS STUDIO* 🚀\n\n*Producto:* ${finalProductName}\n*Cantidad:* ${quantity} unidades\n\nQuedo atento a la cotización formal y los tiempos de fabricación. Muchas gracias!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <aside className="controlsPanel">
      <div className="brandHeader">
        <span className="badge">Cosmética de Lujo</span>
        <h1 className="title">Omar Labs Studio</h1>
      </div>

      <div className="section" style={{ borderTop: 'none', paddingTop: 0 }}>
        <div className="sectionTitle">
          <Box size={16} style={{ color: 'var(--accent-gold)' }} />
          Selecciona tu Producto
        </div>
        <div style={{ position: 'relative' }}>
          <select 
            value={productType}
            onChange={handleProductChange}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              transition: 'border 0.2s'
            }}
            onFocus={(e) => e.target.style.border = '1px solid var(--accent-gold)'}
            onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
          >
            <option value="wax" style={{ background: '#12141a', color: '#fff' }}>Cera Capilar / Tarro</option>
            <option value="minoxidil" style={{ background: '#12141a', color: '#fff' }}>Minoxidil</option>
            <option value="texture_powder" style={{ background: '#12141a', color: '#fff' }}>Polvo de Textura</option>
            <option value="after_shave" style={{ background: '#12141a', color: '#fff' }}>After Shave</option>
          </select>
          <div style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--accent-gold)' }}>
            ▼
          </div>
        </div>
      </div>

      {productType === 'wax' && (
        <div className="section">
          <div className="sectionTitle">
            <Sparkles size={16} style={{ color: 'var(--accent-gold)' }} />
            Selección de Tipo de Envase
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div className="sliderHeader">
                <span>Material del Envase</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.75rem' }}>
                  {currentMaterial === 'alum' ? (currentAlumColor === 'black' ? 'Aluminio Negro' : 'Aluminio Gris Metal') : 'PET Cristal Transparente'}
                </span>
              </div>
              <div className="buttonGroup">
                <button className={`optionButton ${currentMaterial === 'alum' ? 'optionButtonActive' : ''}`} onClick={() => handleMaterialSelect('alum')}>Aluminio</button>
                <button className={`optionButton ${currentMaterial === 'pet' ? 'optionButtonActive' : ''}`} onClick={() => handleMaterialSelect('pet')}>PET Transparente</button>
              </div>
            </div>
            {currentMaterial === 'alum' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem 0.6rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Acabado de Aluminio:</span>
                <div className="buttonGroup">
                  <button className={`optionButton ${currentAlumColor === 'black' ? 'optionButtonActive' : ''}`} style={{ fontSize: '0.72rem', padding: '0.38rem' }} onClick={() => handleAlumColorSelect('black')}>● Negro</button>
                  <button className={`optionButton ${currentAlumColor === 'silver' ? 'optionButtonActive' : ''}`} style={{ fontSize: '0.72rem', padding: '0.38rem' }} onClick={() => handleAlumColorSelect('silver')}>○ Gris Metal</button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div className="sliderHeader">
                <span>Presentación (Capacidad)</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.75rem' }}>
                  {currentMaterial === 'alum' ? '150g (Única)' : currentSize === '150' ? '150g' : '250g'}
                </span>
              </div>
              <div className="buttonGroup">
                <button
                  className={`optionButton ${currentSize === '150' ? 'optionButtonActive' : ''}`}
                  onClick={() => handleSizeSelect('150')}
                >
                  150g
                </button>
                {currentMaterial === 'pet' && (
                  <button
                    className={`optionButton ${currentSize === '250' ? 'optionButtonActive' : ''}`}
                    onClick={() => handleSizeSelect('250')}
                  >
                    250g
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="sectionTitle">
          <Image size={16} style={{ color: 'var(--accent-gold)' }} />
          {productType === 'wax' ? 'Opciones de Diseño y Etiquetas' : 'Carga de Etiquetas'}
        </div>

        {/* Show Design Options (Logo customization vs Full Design) ONLY for Wax */}
        {productType === 'wax' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: designMode === 'full' ? 'rgba(212, 175, 55, 0.1)' : 'transparent', padding: '0.5rem', borderRadius: '6px', border: designMode === 'full' ? '1px solid var(--accent-gold)' : '1px solid transparent', transition: 'all 0.2s' }}>
              <input 
                type="radio" 
                name="designMode"
                checked={designMode === 'full'}
                onChange={() => {
                  setDesignMode('full');
                  if (uploadedLidFile) {
                    setLidLabelUrl(URL.createObjectURL(uploadedLidFile.file));
                  } else {
                    setLidLabelUrl('./default_label.png');
                  }
                  if (uploadedSideFile) {
                    setSideLabelUrl(URL.createObjectURL(uploadedSideFile.file));
                  } else {
                    setSideLabelUrl(productType === 'wax' ? './default_side_label.png' : './default_spray_label.png');
                  }
                }}
                style={{ accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 500 }}>Sube tu diseño completo (Etiqueta Propia)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: designMode === 'logo' ? 'rgba(212, 175, 55, 0.1)' : 'transparent', padding: '0.5rem', borderRadius: '6px', border: designMode === 'logo' ? '1px solid var(--accent-gold)' : '1px solid transparent', transition: 'all 0.2s' }}>
              <input 
                type="radio" 
                name="designMode"
                checked={designMode === 'logo'}
                onChange={() => {
                  setDesignMode('logo');
                  if (uploadedLidLogoFile) {
                    const url = URL.createObjectURL(uploadedLidLogoFile.file);
                    generateCompositeLidLabel(url);
                    generateCompositeLabel(url);
                  } else {
                    setLidLabelUrl('./default_label.png');
                    setSideLabelUrl(productType === 'wax' ? './default_side_label.png' : './default_spray_label.png');
                  }
                }}
                style={{ accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 500 }}>Personaliza con tu logo</span>
            </label>
          </div>
        )}

        {productType === 'wax' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {designMode === 'full' ? 'Etiqueta de la Tapa' : 'Tu Logo (Para Tapa y Cuerpo)'}
            </span>
            
            {designMode === 'full' ? (
              <>
                {!uploadedLidFile ? (
                  <div className={`dropzone ${dragLidActive ? 'dropzoneActive' : ''}`} onDragEnter={handleDragLid} onDragLeave={handleDragLid} onDragOver={handleDragLid} onDrop={handleDropLid} onClick={() => lidFileInputRef.current?.click()}>
                    <input ref={lidFileInputRef} type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleLidFileChange} />
                    <Upload className="dropzoneIcon" />
                    <span className="dropzoneText">Subir diseño para la tapa</span>
                    <span className="dropzoneSubtext">PNG / JPG (Medida recomendada abajo)</span>
                  </div>
                ) : (
                  <div className="uploadedFileCard">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ padding: '0.4rem', background: 'rgba(212, 175, 55, 0.15)', borderRadius: '6px', color: 'var(--accent-gold)' }}><Image size={16} /></div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedLidFile.name}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{uploadedLidFile.size}</span>
                      </div>
                    </div>
                    <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.3rem' }} onClick={() => { setUploadedLidFile(null); setLidLabelUrl('./default_label.png'); }} title="Eliminar diseño"><Trash2 size={16} /></button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#ffffff', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                    ⚠️ Importante sobre tu logo
                  </p>
                  <p style={{ margin: 0, fontSize: '0.7rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.8)' }}>
                    Sube tu logo en <strong>color blanco o de colores</strong> (evita el color negro). 
                    La imagen debe tener <strong>fondo transparente</strong> (PNG). Lo aplicaremos automáticamente tanto a la tapa como al cuerpo del envase.
                  </p>
                </div>

                {!uploadedLidLogoFile ? (
                  <div
                    className={`dropzone`}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/png, image/jpeg';
                      input.onchange = (e: any) => handleLidLogoFileChange(e);
                      input.click();
                    }}
                  >
                    <Upload className="dropzoneIcon" />
                    <span className="dropzoneText">Subir tu Logo</span>
                    <span className="dropzoneSubtext">PNG transparente recomendado</span>
                  </div>
                ) : (
                  <div className="uploadedFileCard">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ padding: '0.4rem', background: 'rgba(212, 175, 55, 0.15)', borderRadius: '6px', color: 'var(--accent-gold)' }}><Image size={16} /></div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedLidLogoFile.name}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{uploadedLidLogoFile.size}</span>
                      </div>
                    </div>
                    <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.3rem' }} onClick={() => { setUploadedLidLogoFile(null); setLidLabelUrl('./default_label.png'); setSideLabelUrl(productType === 'wax' ? './default_side_label.png' : './default_spray_label.png'); }} title="Eliminar logo"><Trash2 size={16} /></button>
                  </div>
                )}
              </>
            )}
            
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-gold)' }} />
              <span><b>Medidas sugeridas:</b> 1:1. Formato <b>PNG con fondo transparente</b>.</span>
            </div>
          </div>
        )}

        {/* --- UPLOADER 2: BODY/CYLINDER --- */}
        {(productType !== 'wax' || designMode === 'full') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Etiqueta del Cuerpo ({productType === 'wax' ? 'Tarro' : 'Lata'})
            </span>

            {!uploadedSideFile ? (
              <div
                className={`dropzone ${dragSideActive ? 'dropzoneActive' : ''}`}
                onDragEnter={handleDragSide}
                onDragLeave={handleDragSide}
                onDragOver={handleDragSide}
                onDrop={handleDropSide}
                onClick={() => sideFileInputRef.current?.click()}
              >
                <input
                  ref={sideFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg"
                  style={{ display: 'none' }}
                  onChange={handleSideFileChange}
                />
                <Upload className="dropzoneIcon" />
                <span className="dropzoneText">Subir etiqueta para el cuerpo</span>
                <span className="dropzoneSubtext">PNG / JPG (2048x512 px recomendado)</span>
              </div>
            ) : (
              <div className="uploadedFileCard">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ padding: '0.4rem', background: 'rgba(212, 175, 55, 0.15)', borderRadius: '6px', color: 'var(--accent-gold)' }}>
                    <Image size={16} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {uploadedSideFile.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{uploadedSideFile.size}</span>
                  </div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.3rem' }}
                  onClick={() => {
                    setUploadedSideFile(null);
                    setSideLabelUrl(productType === 'wax' ? './default_side_label.png' : './default_spray_label.png');
                  }}
                  title="Eliminar diseño"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-gold)' }} />
              <span><b>Medidas recomendadas:</b> Rectangular <b>2048 x 512 px (Proporción 4:1)</b>. Cubre todo el contorno sin estirarse.</span>
            </div>
          </div>
        )}
      </div>

      {/* Product-specific options */}
      {productType === 'wax' && (
        <div className="section">
          <div className="sectionTitle">
            <Sparkles size={16} style={{ color: 'var(--accent-gold)' }} />
            Fórmula y Contenido del Envase
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div className="buttonGroup">
              <button
                className={`optionButton ${!hasWax || waxFormula === 'none' ? 'optionButtonActive' : ''}`}
                onClick={() => {
                  setHasWax(false);
                  setWaxFormula('none');
                }}
              >
                Sin Contenido
              </button>
              <button
                className={`optionButton ${hasWax && waxFormula === 'mate' ? 'optionButtonActive' : ''}`}
                onClick={() => {
                  setHasWax(true);
                  setWaxFormula('mate');
                  setWaxColor('#ffffff');
                  setWaxRoughness(0.85);
                  setLidOpen(true);
                }}
              >
                Base Mate
              </button>
              <button
                className={`optionButton ${hasWax && waxFormula === 'water' ? 'optionButtonActive' : ''}`}
                onClick={() => {
                  setHasWax(true);
                  setWaxFormula('water');
                  if (waxColor === '#ffffff' || waxColor === '#f3f4f6') {
                    setWaxColor('#ef4444');
                  }
                  setWaxRoughness(0.2);
                  setLidOpen(true);
                }}
              >
                Base Agua
              </button>
            </div>

            {/* RESTORED 8 WATER-BASED COLOR SWATCHES */}
            {hasWax && waxFormula === 'water' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                <div className="sliderHeader">
                  <span>Selecciona el Color de la Cera:</span>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.75rem' }}>
                    {WATER_BASED_WAXES.find(w => w.color === waxColor)?.name || 'Selecciona'}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {WATER_BASED_WAXES.map((preset) => (
                    <button
                      key={preset.color}
                      onClick={() => {
                        setHasWax(true);
                        setWaxFormula('water');
                        setWaxColor(preset.color);
                        setWaxRoughness(0.2);
                        setLidOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.35rem 0.1rem',
                        borderRadius: '8px',
                        background: waxColor === preset.color ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: waxColor === preset.color ? '1.5px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: preset.color,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          border: waxColor === preset.color ? '2px solid #ffffff' : 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.62rem', color: waxColor === preset.color ? 'var(--accent-gold)' : 'var(--text-secondary)', fontWeight: waxColor === preset.color ? 600 : 400, textAlign: 'center' }}>
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lid Toggle */}
            <div style={{ marginTop: '0.2rem' }}>
              <div className="buttonGroup">
                <button
                  className={`optionButton ${!lidOpen ? 'optionButtonActive' : ''}`}
                  onClick={() => setLidOpen(false)}
                >
                  Cerrar Envase
                </button>
                <button
                  className={`optionButton ${lidOpen ? 'optionButtonActive' : ''}`}
                  onClick={() => setLidOpen(true)}
                >
                  Destapar Envase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {productType === 'minoxidil' && (
        <div className="section">
          <div className="sectionTitle">
            <Box size={16} style={{ color: 'var(--accent-gold)' }} />
            Presentación (Capacidad)
          </div>
          <div className="buttonGroup">
            <button className={`optionButton ${minoxidilSize === '50ml' ? 'optionButtonActive' : ''}`} onClick={() => setMinoxidilSize('50ml')}>50ml</button>
            <button className={`optionButton ${minoxidilSize === '30ml' ? 'optionButtonActive' : ''}`} onClick={() => setMinoxidilSize('30ml')}>30ml</button>
          </div>
        </div>
      )}

      {productType === 'texture_powder' && (
        <div className="section">
          <div className="sectionTitle">
            <Box size={16} style={{ color: 'var(--accent-gold)' }} />
            Presentación (Capacidad)
          </div>
          <div className="buttonGroup">
            <button className={`optionButton ${powderSize === '80g' ? 'optionButtonActive' : ''}`} onClick={() => setPowderSize('80g')}>80g</button>
            <button className={`optionButton ${powderSize === '40g' ? 'optionButtonActive' : ''}`} onClick={() => setPowderSize('40g')}>40g</button>
          </div>
        </div>
      )}

      {productType === 'after_shave' && (
        <div className="section">
          <div className="sectionTitle">
            <Box size={16} style={{ color: 'var(--accent-gold)' }} />
            Presentación (Capacidad)
          </div>
          <div className="buttonGroup">
            <button className={`optionButton ${afterShaveSize === '500ml' ? 'optionButtonActive' : ''}`} onClick={() => setAfterShaveSize('500ml')}>500ml</button>
            <button className={`optionButton ${afterShaveSize === '250ml' ? 'optionButtonActive' : ''}`} onClick={() => setAfterShaveSize('250ml')}>250ml</button>
          </div>
        </div>
      )}
      {/* End of product options */}

      {/* --- ORDER BUTTON --- */}
      <div className="section" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.2rem', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => window.location.href = 'https://omarstudio.com.mx'}
          style={{
            width: '100%',
            height: 40,
            borderRadius: '8px',
            background: 'var(--accent-gold)',
            color: '#000000',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}
        >
          <ShoppingCart size={16} /> Visitar Omar Studio
        </button>
      </div>

      <div className="section" style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
        <button className="actionBtn" onClick={handleCapture}>
          <Download size={16} /> Descargar Mockup 3D (PNG)
        </button>
      </div>

      {showOrderModal && typeof window !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowOrderModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#12141a',
              border: '1px solid var(--accent-gold)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
            }}
          >
            <button
              onClick={() => setShowOrderModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShoppingCart size={18} style={{ color: 'var(--accent-gold)' }} />
              Finalizar y Enviar Pedido
            </h3>

            <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.75rem 0.9rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Producto:</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{productType === 'wax' ? 'Cera Capilar / Tarro' : 'Spray Aerosol'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Envase:</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{currentMaterial === 'alum' ? `Aluminio ${currentAlumColor === 'black' ? 'Negro' : 'Gris Metal'} (${currentSize}g)` : `PET Cristal Transparente (${currentSize}g)`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Fórmula:</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{!hasWax || waxFormula === 'none' ? 'Envase Vacío' : waxFormula === 'mate' ? 'Base Mate (Blanco)' : `Base Agua (${WATER_BASED_WAXES.find(w => w.color === waxColor)?.name || waxColor})`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cantidad:</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{quantity} Unidades</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Ingresa tu correo electrónico:
              </label>
              <input
                type="email"
                placeholder="tu-correo@ejemplo.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                style={{
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: emailError ? '1px solid #ef4444' : '1px solid var(--accent-gold)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              {emailError && (
                <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>{emailError}</span>
              )}
            </div>

            {emailSuccess ? (
              <div
                style={{
                  padding: '0.85rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  borderRadius: '10px',
                  color: '#10b981',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  lineHeight: '1.4',
                }}
              >
                ✅ <b>¡Cotización y Render 3D enviados!</b><br />
                Enviado a <b>{clientEmail}</b>, <b>admin@omarstudio.com.mx</b> y <b>barbersfc@omarstudio.com.mx</b>.
              </div>
            ) : (
              <button
                onClick={handleSendEmailOrder}
                disabled={isSendingEmail}
                style={{
                  padding: '0.8rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 800,
                  cursor: isSendingEmail ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                  opacity: isSendingEmail ? 0.7 : 1,
                }}
              >
                <Send size={16} />
                {isSendingEmail ? 'Enviando Pedido...' : 'Enviar Pedido y Render por Correo'}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Prospecto Modal */}
      {showProspectoModal && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#18181b', padding: '2.5rem 2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)' }}>
            
            <button
              onClick={() => {
                setShowProspectoModal(false);
                setPendingFileAction(null);
              }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#ffffff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Sube tu propio diseño</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
                Para poder visualizar tu propia etiqueta en nuestro modelo 3D, compártenos tu nombre y correo.
              </p>
            </div>

            <form onSubmit={submitLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e4e4e7' }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  style={{ padding: '0.7rem 0.85rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  onFocus={(e) => e.target.style.border = '1px solid var(--accent-gold)'}
                  onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e4e4e7' }}>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="juan@ejemplo.com"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  style={{ padding: '0.7rem 0.85rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  onFocus={(e) => e.target.style.border = '1px solid var(--accent-gold)'}
                  onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e4e4e7' }}>Teléfono</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 55 1234 5678"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  style={{ padding: '0.7rem 0.85rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  onFocus={(e) => e.target.style.border = '1px solid var(--accent-gold)'}
                  onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingLead}
                style={{ marginTop: '0.5rem', padding: '0.8rem', borderRadius: '8px', background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)', border: 'none', color: '#000000', fontWeight: 800, cursor: isSubmittingLead ? 'wait' : 'pointer', fontSize: '0.95rem', opacity: isSubmittingLead ? 0.7 : 1, transition: 'opacity 0.2s' }}
              >
                {isSubmittingLead ? 'Registrando...' : 'Continuar al Simulador'}
              </button>
            </form>

          </div>
        </div>,
        document.body
      )}

    </aside>
  );
}
