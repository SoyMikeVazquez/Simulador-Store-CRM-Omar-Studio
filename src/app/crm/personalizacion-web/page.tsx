'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Video, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Trash2, 
  RotateCw, 
  Film, 
  Sparkles,
  Link as LinkIcon,
  Copy,
  Info,
  ArrowDown,
  Check,
  PlaySquare,
  Layers,
  Calendar,
  CalendarDays,
  Plus,
  Edit3,
  Clock,
  Image as ImageIcon,
  X
} from 'lucide-react';

const MAX_VIDEO_BYTES = 6 * 1024 * 1024; // 6 MB estrictos
const MAX_BRAND_BYTES = 500 * 1024; // 500 KB estrictos
const DEFAULT_FALLBACK_URL = '/hero-video.mp4';

export interface VideoWebRecord {
  id: number;
  created_at?: string;
  link: string;
  activo: boolean;
}

export interface MarcaRecord {
  id: number;
  created_at?: string;
  marcas: string;
}

export interface EventoRecord {
  id: string;
  imagenDeEvento?: string | null;
  TituloDeEvento: string;
  DescripcionDelEvento?: string | null;
  FechaDeEvento?: string | null;
  FechaEnQueFinalizo?: string | null;
  IDdeEvento?: string | null;
  FechaYaNoVerNuevoEvento?: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function PersonalizacionWebPage() {
  // Pestaña principal activa: 'video' | 'eventos' | 'marcas'
  const [mainTab, setMainTab] = useState<'video' | 'eventos' | 'marcas'>('video');

  // ==========================================
  // ESTADOS SECCIÓN VIDEO HERO
  // ==========================================
  const [videos, setVideos] = useState<VideoWebRecord[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [manualUrl, setManualUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Identificar el video actualmente activo
  const activeVideo = videos.find(v => v.activo) || (videos.length > 0 ? videos[0] : null);

  // ==========================================
  // ESTADOS SECCIÓN MARCAS ALIADAS
  // ==========================================
  const [marcasList, setMarcasList] = useState<MarcaRecord[]>([]);
  const [loadingMarcas, setLoadingMarcas] = useState(true);
  const [deletingMarcaId, setDeletingMarcaId] = useState<number | null>(null);

  const [selectedMarcaFile, setSelectedMarcaFile] = useState<File | null>(null);
  const [marcaPreviewUrl, setMarcaPreviewUrl] = useState<string | null>(null);
  const [marcaFileSizeError, setMarcaFileSizeError] = useState<string | null>(null);
  const [marcaDimensionInfo, setMarcaDimensionInfo] = useState<{ width: number; height: number; isSquare: boolean } | null>(null);
  const [isDraggingMarca, setIsDraggingMarca] = useState(false);
  const [uploadingMarca, setUploadingMarca] = useState(false);
  const [uploadMarcaProgress, setUploadMarcaProgress] = useState<number>(0);

  const [manualMarcaUrl, setManualMarcaUrl] = useState('');
  const [marcaActiveTab, setMarcaActiveTab] = useState<'upload' | 'url'>('upload');
  const [copiedMarcaId, setCopiedMarcaId] = useState<number | null>(null);

  const marcaFileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // ESTADOS SECCIÓN EVENTOS
  // ==========================================
  const [eventos, setEventos] = useState<EventoRecord[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  // Formulario de evento
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [eventImageUrl, setEventImageUrl] = useState('');
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const [isDraggingEventImage, setIsDraggingEventImage] = useState(false);
  const eventImageInputRef = useRef<HTMLInputElement>(null);

  // 1. Cargar catálogo de videos
  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      const { data, error } = await supabase
        .from('Video_web')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error consultando Video_web:', error);
      } else if (data) {
        const normalized: VideoWebRecord[] = data.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          link: item.link,
          activo: Boolean(item.activo)
        }));
        setVideos(normalized);
      }
    } catch (err: any) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  };

  // 2. Cargar eventos de la tabla 'Eventos'
  const fetchEventos = async () => {
    setLoadingEventos(true);
    try {
      const { data, error } = await supabase
        .from('Eventos')
        .select('*')
        .order('FechaDeEvento', { ascending: false });

      if (error) {
        console.error('Error consultando Eventos:', error);
      } else if (data) {
        setEventos(data as EventoRecord[]);
      }
    } catch (err: any) {
      console.error('Error fetching eventos:', err);
    } finally {
      setLoadingEventos(false);
    }
  };

  // 3. Cargar catálogo de marcas de la tabla 'marcas'
  const fetchMarcas = async () => {
    setLoadingMarcas(true);
    try {
      const { data, error } = await supabase
        .from('marcas')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error consultando marcas:', error);
      } else if (data) {
        const normalized: MarcaRecord[] = data.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          marcas: item.marcas || ''
        }));
        setMarcasList(normalized);
      }
    } catch (err: any) {
      console.error('Error fetching marcas:', err);
    } finally {
      setLoadingMarcas(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchEventos();
    fetchMarcas();

    // Prevenir que el navegador abra archivos arrastrados fuera de dropzones
    const preventWindowDrag = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventWindowDrag);
    window.addEventListener('drop', preventWindowDrag);

    return () => {
      window.removeEventListener('dragover', preventWindowDrag);
      window.removeEventListener('drop', preventWindowDrag);
    };
  }, []);

  // ==========================================
  // MANEJADORES DE VIDEO HERO
  // ==========================================
  const processFile = (file: File) => {
    setFileSizeError(null);
    setSuccessMsg(null);
    setErrorMsg(null);

    const isVideoType = file.type.startsWith('video/') || 
      /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);

    if (!isVideoType) {
      setFileSizeError('El archivo seleccionado no es un formato de video válido (utiliza MP4, WebM o MOV).');
      setSelectedFile(null);
      setFilePreviewUrl(null);
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileSizeError(`El video pesa ${sizeMB} MB y excede el límite máximo permitido de 6.0 MB. Por favor comprime o recorta el video antes de subirlo.`);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setFilePreviewUrl(localUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleSetActive = async (targetId: number) => {
    setActivatingId(targetId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await supabase
        .from('Video_web')
        .update({ activo: false })
        .neq('id', targetId);

      const { error: setErr } = await supabase
        .from('Video_web')
        .update({ activo: true })
        .eq('id', targetId);

      if (setErr) throw new Error(setErr.message);

      setSuccessMsg(`¡Video #${targetId} establecido como ACTIVO en omarstudio.com.mx!`);
      await fetchVideos();
    } catch (err: any) {
      console.error('Error al cambiar video activo:', err);
      setErrorMsg(err.message || 'No se pudo activar el video seleccionado.');
    } finally {
      setActivatingId(null);
    }
  };

  const handleUploadVideo = async () => {
    if (!selectedFile) return;

    if (selectedFile.size > MAX_VIDEO_BYTES) {
      setFileSizeError('El archivo excede el límite de 6 MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const ext = selectedFile.name.split('.').pop() || 'mp4';
      const cleanFileName = `hero_${Date.now()}.${ext.toLowerCase()}`;
      const storagePath = `videos/${cleanFileName}`;

      setUploadProgress(35);

      let uploadRes = await supabase.storage
        .from('eriquetas')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: selectedFile.type || 'video/mp4'
        });

      if (uploadRes.error) {
        uploadRes = await supabase.storage
          .from('general')
          .upload(storagePath, selectedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: selectedFile.type || 'video/mp4'
          });
      }

      if (uploadRes.error) throw new Error(`Error en storage: ${uploadRes.error.message}`);

      setUploadProgress(70);

      const { data: publicUrlData } = supabase.storage
        .from('eriquetas')
        .getPublicUrl(storagePath);

      const publicVideoUrl = publicUrlData.publicUrl;

      setUploadProgress(85);

      await supabase
        .from('Video_web')
        .update({ activo: false })
        .neq('id', 0);

      const { error: dbError } = await supabase
        .from('Video_web')
        .insert([{ link: publicVideoUrl, activo: true }]);

      if (dbError) throw new Error(dbError.message);

      setUploadProgress(100);
      setSuccessMsg('¡Nuevo video subido y activado con éxito en omarstudio.com.mx!');
      setSelectedFile(null);
      setFilePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await fetchVideos();
    } catch (err: any) {
      console.error('Error al procesar el video:', err);
      setErrorMsg(err.message || 'Ocurrió un error al subir el video.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSaveManualUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanUrl = manualUrl.trim();

      await supabase
        .from('Video_web')
        .update({ activo: false })
        .neq('id', 0);

      const { error: dbError } = await supabase
        .from('Video_web')
        .insert([{ link: cleanUrl, activo: true }]);

      if (dbError) throw new Error(dbError.message);

      setSuccessMsg('¡Enlace de video guardado y activado como portada correctamente!');
      setManualUrl('');
      await fetchVideos();
    } catch (err: any) {
      console.error('Error saving manual URL:', err);
      setErrorMsg(err.message || 'Error al guardar el enlace del video.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (targetId: number, wasActive: boolean) => {
    if (!confirm(`¿Deseas eliminar el video #${targetId} del catálogo?`)) return;

    setDeletingId(targetId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('Video_web')
        .delete()
        .eq('id', targetId);

      if (error) throw new Error(error.message);

      setSuccessMsg(`Video #${targetId} eliminado del catálogo.`);

      const remaining = videos.filter(v => v.id !== targetId);
      if (wasActive && remaining.length > 0) {
        await supabase
          .from('Video_web')
          .update({ activo: true })
          .eq('id', remaining[0].id);
      }

      await fetchVideos();
    } catch (err: any) {
      console.error('Error deleting video:', err);
      setErrorMsg(err.message || 'No se pudo eliminar el video de Video_web.');
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // MANEJADORES DE EVENTOS
  // ==========================================
  const toLocalDatetimeInput = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const resetEventForm = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventDesc('');
    setEventStartDate('');
    setEventEndDate('');
    setEventCode('');
    setEventImageUrl('');
    setEventImageFile(null);
    setEventImagePreview(null);
    setShowEventForm(false);
    if (eventImageInputRef.current) eventImageInputRef.current.value = '';
  };

  const handleOpenEditEvent = (evt: EventoRecord) => {
    setEditingEventId(evt.id);
    setEventTitle(evt.TituloDeEvento || '');
    setEventDesc(evt.DescripcionDelEvento || '');
    setEventStartDate(toLocalDatetimeInput(evt.FechaDeEvento));
    setEventEndDate(toLocalDatetimeInput(evt.FechaEnQueFinalizo));
    setEventCode(evt.IDdeEvento || '');
    setEventImageUrl(evt.imagenDeEvento || '');
    setEventImagePreview(evt.imagenDeEvento || null);
    setEventImageFile(null);
    setShowEventForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEventImageChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('La imagen no debe superar los 5 MB.');
      return;
    }
    setEventImageFile(file);
    setEventImagePreview(URL.createObjectURL(file));
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    // La imagen es el único campo obligatorio
    if (!eventImageFile && !eventImageUrl.trim() && !eventImagePreview) {
      setErrorMsg('La imagen del evento es obligatoria. Por favor selecciona un archivo o ingresa una URL.');
      return;
    }

    setSavingEvent(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let finalImageUrl = eventImageUrl.trim();

      // Si subió un archivo nuevo de imagen, guardarlo en Storage
      if (eventImageFile) {
        const ext = eventImageFile.name.split('.').pop() || 'jpg';
        const cleanName = `evento_${Date.now()}.${ext.toLowerCase()}`;
        const path = `eventos/${cleanName}`;

        const up = await supabase.storage
          .from('eriquetas')
          .upload(path, eventImageFile, { upsert: true, contentType: eventImageFile.type });

        if (!up.error) {
          const { data } = supabase.storage.from('eriquetas').getPublicUrl(path);
          finalImageUrl = data.publicUrl;
        } else {
          throw new Error(`Error subiendo la imagen del evento: ${up.error.message}`);
        }
      }

      if (!finalImageUrl) {
        setErrorMsg('La imagen del evento es obligatoria. Por favor selecciona o sube una imagen.');
        setSavingEvent(false);
        return;
      }

      const displayTitle = eventTitle.trim() || 'Evento';

      const payload: any = {
        TituloDeEvento: displayTitle,
        DescripcionDelEvento: eventDesc.trim() || null,
        FechaDeEvento: eventStartDate ? new Date(eventStartDate).toISOString() : null,
        FechaEnQueFinalizo: eventEndDate ? new Date(eventEndDate).toISOString() : null,
        IDdeEvento: eventCode.trim() || `EVT-${Date.now().toString().slice(-6)}`,
        imagenDeEvento: finalImageUrl,
        updated_at: new Date().toISOString()
      };

      if (editingEventId) {
        const { error } = await supabase
          .from('Eventos')
          .update(payload)
          .eq('id', editingEventId);

        if (error) throw error;
        setSuccessMsg(`¡Evento "${displayTitle}" actualizado con éxito!`);
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase
          .from('Eventos')
          .insert([payload]);

        if (error) throw error;
        setSuccessMsg(`¡Evento "${displayTitle}" creado y publicado con éxito!`);
      }

      resetEventForm();
      await fetchEventos();
    } catch (err: any) {
      console.error('Error guardando evento:', err);
      setErrorMsg(err.message || 'Error al guardar el evento en la base de datos.');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar el evento "${title}"? Esta acción no se puede deshacer.`)) return;

    setDeletingEventId(id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('Eventos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccessMsg(`Evento "${title}" eliminado.`);
      await fetchEventos();
    } catch (err: any) {
      console.error('Error deleting event:', err);
      setErrorMsg(err.message || 'No se pudo eliminar el evento.');
    } finally {
      setDeletingEventId(null);
    }
  };

  const getEventStatus = (start?: string | null, end?: string | null) => {
    if (!start) return { label: 'Sin Fecha', color: '#a1a1aa', bg: 'rgba(255,255,255,0.08)' };
    const now = new Date().getTime();
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : startTime;

    if (now >= startTime && now <= endTime) {
      return { label: '● EN CURSO', color: '#10b981', bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)' };
    } else if (now < startTime) {
      return { label: '● PRÓXIMO', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)' };
    } else {
      return { label: 'FINALIZADO', color: '#71717a', bg: 'rgba(255, 255, 255, 0.06)', border: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  // ==========================================
  // MANEJADORES DE LOGOTIPOS DE MARCAS
  // ==========================================
  const processMarcaFile = (file: File) => {
    setMarcaFileSizeError(null);
    setMarcaDimensionInfo(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Límite estricto de 500 KB (500 * 1024 bytes)
    if (file.size > MAX_BRAND_BYTES) {
      const sizeKb = (file.size / 1024).toFixed(1);
      const errMsg = `El archivo supera el límite de 500 KB permitido (${sizeKb} KB). Por favor optimiza o comprime la imagen antes de subirla.`;
      setMarcaFileSizeError(errMsg);
      setErrorMsg(errMsg);
      setSelectedMarcaFile(null);
      setMarcaPreviewUrl(null);
      if (marcaFileInputRef.current) marcaFileInputRef.current.value = '';
      return;
    }

    // Formatos válidos de imagen
    const validTypes = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      const errMsg = 'Formato no soportado. Se recomienda formato PNG sin fondo (o WebP, SVG).';
      setErrorMsg(errMsg);
      setSelectedMarcaFile(null);
      setMarcaPreviewUrl(null);
      if (marcaFileInputRef.current) marcaFileInputRef.current.value = '';
      return;
    }

    setSelectedMarcaFile(file);
    const objectUrl = URL.createObjectURL(file);
    setMarcaPreviewUrl(objectUrl);

    // Medir dimensiones reales para orientar sobre la proporción 1:1
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = w / h;
      const isSquare = ratio >= 0.85 && ratio <= 1.15;
      setMarcaDimensionInfo({ width: w, height: h, isSquare });
    };
    img.src = objectUrl;
  };

  const handleMarcaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processMarcaFile(file);
    }
  };

  const handleMarcaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingMarca) setIsDraggingMarca(true);
  };

  const handleMarcaDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMarca(true);
  };

  const handleMarcaDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingMarca(false);
  };

  const handleMarcaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMarca(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processMarcaFile(files[0]);
    }
  };

  const handleUploadMarca = async () => {
    if (!selectedMarcaFile && !manualMarcaUrl.trim()) {
      setErrorMsg('Selecciona un archivo de logotipo o ingresa una URL válida.');
      return;
    }

    setUploadingMarca(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadMarcaProgress(20);

    try {
      let finalUrl = '';

      if (marcaActiveTab === 'upload' && selectedMarcaFile) {
        setUploadMarcaProgress(45);
        const fileExt = selectedMarcaFile.name.split('.').pop() || 'png';
        const cleanName = selectedMarcaFile.name
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .substring(0, 30);
        const fileName = `marca_${Date.now()}_${cleanName}.${fileExt}`;
        const filePath = `marcas/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('eriquetas')
          .upload(filePath, selectedMarcaFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: selectedMarcaFile.type
          });

        if (uploadError) {
          throw new Error(`Error al subir imagen a Supabase Storage: ${uploadError.message}`);
        }

        setUploadMarcaProgress(80);
        const { data: publicUrlData } = supabase.storage
          .from('eriquetas')
          .getPublicUrl(filePath);

        finalUrl = publicUrlData.publicUrl;
      } else {
        finalUrl = manualMarcaUrl.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('/')) {
          throw new Error('La URL ingresada no es válida.');
        }
      }

      setUploadMarcaProgress(90);

      const { error: insertError } = await supabase
        .from('marcas')
        .insert([{ marcas: finalUrl }]);

      if (insertError) {
        throw new Error(`Error al registrar el logotipo en la base de datos: ${insertError.message}`);
      }

      setUploadMarcaProgress(100);
      setSuccessMsg('¡Logotipo de marca agregado con éxito! Ya se mostrará en el carrusel de la web.');

      // Limpiar formulario
      setSelectedMarcaFile(null);
      setMarcaPreviewUrl(null);
      setManualMarcaUrl('');
      setMarcaDimensionInfo(null);
      if (marcaFileInputRef.current) marcaFileInputRef.current.value = '';

      await fetchMarcas();
    } catch (err: any) {
      console.error('Error subiendo marca:', err);
      setErrorMsg(err.message || 'Error inesperado al subir la marca.');
    } finally {
      setUploadingMarca(false);
      setTimeout(() => setUploadMarcaProgress(0), 1000);
    }
  };

  const handleDeleteMarca = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este logotipo de marca? Se removerá del carrusel de la web.')) return;

    setDeletingMarcaId(id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('marcas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccessMsg('Logotipo eliminado exitosamente.');
      await fetchMarcas();
    } catch (err: any) {
      console.error('Error deleting marca:', err);
      setErrorMsg(err.message || 'No se pudo eliminar el logotipo.');
    } finally {
      setDeletingMarcaId(null);
    }
  };

  const handleSaveManualMarcaUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMarcaUrl.trim()) return;
    await handleUploadMarca();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1280px', margin: '0 auto', width: '100%', fontFamily: 'var(--font-outfit), sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#eedfc6', fontWeight: 700 }}>
              Panel de Administración
            </span>
            <span style={{ fontSize: '0.65rem', background: 'rgba(238, 223, 198, 0.1)', color: '#eedfc6', padding: '0.2rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(238, 223, 198, 0.25)', fontWeight: 600 }}>
              omarstudio.com.mx
            </span>
          </div>
          <h1 className="font-bronco" style={{ margin: 0, fontSize: '2.1rem', letterSpacing: '0.04em', color: '#ffffff' }}>
            PERSONALIZA TU WEB
          </h1>
          <p style={{ margin: '0.4rem 0 0 0', color: '#a1a1aa', fontSize: '0.88rem' }}>
            Gestiona los videos de portada, publica eventos especiales y administra los logotipos de marcas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => { fetchVideos(); fetchEventos(); fetchMarcas(); }}
            disabled={loadingVideos || loadingEventos || loadingMarcas}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1rem',
              background: '#181818',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#eedfc6',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: (loadingVideos || loadingEventos || loadingMarcas) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RotateCw size={14} className={(loadingVideos || loadingEventos || loadingMarcas) ? 'animate-spin' : ''} />
            Actualizar Datos
          </button>

          <a
            href="https://omarstudio.com.mx"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              background: '#eedfc6',
              color: '#0b0b0b',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 800,
              textDecoration: 'none',
              letterSpacing: '0.04em',
              boxShadow: '0 4px 15px rgba(238, 223, 198, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            Ver Web en Vivo <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Main Feature Tabs Switcher */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setMainTab('video')}
          style={{
            padding: '0.75rem 1.4rem',
            background: mainTab === 'video' ? 'rgba(238, 223, 198, 0.12)' : 'transparent',
            border: mainTab === 'video' ? '1px solid #eedfc6' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            color: mainTab === 'video' ? '#eedfc6' : '#a1a1aa',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            transition: 'all 0.2s'
          }}
        >
          <Film size={18} /> Video del Hero ({videos.length})
        </button>

        <button
          onClick={() => setMainTab('eventos')}
          style={{
            padding: '0.75rem 1.4rem',
            background: mainTab === 'eventos' ? 'rgba(238, 223, 198, 0.12)' : 'transparent',
            border: mainTab === 'eventos' ? '1px solid #eedfc6' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            color: mainTab === 'eventos' ? '#eedfc6' : '#a1a1aa',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            transition: 'all 0.2s'
          }}
        >
          <CalendarDays size={18} /> Eventos Personalizados ({eventos.length})
        </button>

        <button
          onClick={() => setMainTab('marcas')}
          style={{
            padding: '0.75rem 1.4rem',
            background: mainTab === 'marcas' ? 'rgba(238, 223, 198, 0.12)' : 'transparent',
            border: mainTab === 'marcas' ? '1px solid #eedfc6' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            color: mainTab === 'marcas' ? '#eedfc6' : '#a1a1aa',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            transition: 'all 0.2s'
          }}
        >
          <ImageIcon size={18} /> Marcas ({marcasList.length})
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '10px', color: '#6ee7b7', marginBottom: '1.75rem', fontSize: '0.88rem' }}>
          <CheckCircle2 size={20} color="#10b981" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', color: '#fca5a5', marginBottom: '1.75rem', fontSize: '0.88rem' }}>
          <AlertCircle size={20} color="#ef4444" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 1: VIDEO DEL HERO PRINCIPAL                        */}
      {/* ======================================================== */}
      {mainTab === 'video' && (
        <div>
          {/* Main Grid: Active Video Preview on Left, Uploader on Right */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem', marginBottom: '3rem' }}>
            
            {/* Left Column: Current Active Video Display */}
            <div style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Film size={18} color="#eedfc6" />
                  <h3 className="font-bronco" style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                    VIDEO ACTIVO EN PORTADA
                  </h3>
                </div>
                {activeVideo?.link ? (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    ● Activo en Web (ID #{activeVideo.id})
                  </span>
                ) : (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(238, 223, 198, 0.1)', color: '#eedfc6', border: '1px solid rgba(238, 223, 198, 0.25)', padding: '0.2rem 0.55rem', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                    Fallback por Defecto
                  </span>
                )}
              </div>

              {/* Video Preview Box */}
              <div style={{ width: '100%', aspectRatio: '16/9', background: '#000000', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(238, 223, 198, 0.25)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
                {loadingVideos ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#a1a1aa' }}>
                    <Loader2 size={30} className="animate-spin" color="#eedfc6" />
                    <span style={{ fontSize: '0.8rem' }}>Cargando video activo...</span>
                  </div>
                ) : (
                  <video
                    key={activeVideo?.link || DEFAULT_FALLBACK_URL}
                    src={activeVideo?.link || DEFAULT_FALLBACK_URL}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>

              {/* Metadata Card */}
              <div style={{ marginTop: '1.25rem', background: '#161616', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#a1a1aa', fontWeight: 600 }}>Estado:</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>
                    {activeVideo ? `Reproduciéndose en omarstudio.com.mx` : 'Video Estándar Local'}
                  </span>
                </div>

                {activeVideo?.created_at && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#a1a1aa', fontWeight: 600 }}>Fecha de Subida:</span>
                    <span style={{ color: '#ffffff' }}>
                      {new Date(activeVideo.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                )}

                {activeVideo?.link && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: '#71717a', fontSize: '0.72rem', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Enlace Público Activo:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        readOnly
                        value={activeVideo.link}
                        style={{ flex: 1, background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: '#a1a1aa', fontSize: '0.75rem', outline: 'none' }}
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(activeVideo.link); setCopiedId(activeVideo.id); setTimeout(() => setCopiedId(null), 2000); }}
                        title="Copiar enlace"
                        style={{ background: '#222222', border: '1px solid rgba(255,255,255,0.15)', color: copiedId === activeVideo.id ? '#10b981' : '#ffffff', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Uploader & Drag/Drop Dropzone */}
            <div style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={18} color="#eedfc6" />
                  <h3 className="font-bronco" style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                    SUBIR NUEVO VIDEO
                  </h3>
                </div>
                
                <span style={{ fontSize: '0.72rem', color: '#eedfc6', fontWeight: 700, background: 'rgba(238, 223, 198, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(238, 223, 198, 0.25)' }}>
                  Máx 6.0 MB
                </span>
              </div>

              {/* Guidelines Callout */}
              <div style={{ background: 'rgba(238, 223, 198, 0.06)', border: '1px solid rgba(238, 223, 198, 0.2)', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#eedfc6', lineHeight: 1.45 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Requisitos y Almacenamiento:</strong>
                    <ul style={{ margin: '0.35rem 0 0 1rem', padding: 0, color: '#e5e7eb', fontSize: '0.77rem' }}>
                      <li>Límite de peso: <strong>6.0 MB</strong> (para carga veloz en móviles y escritorio).</li>
                      <li>Formatos compatibles: <strong>MP4 (H.264), WebM, MOV</strong>.</li>
                      <li>Al subirlo, se guardará en tu catálogo y se activará de inmediato.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Selector Tabs: Subir Archivo vs URL Directa */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: '#161616', padding: '0.35rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    background: activeTab === 'upload' ? '#eedfc6' : 'transparent',
                    color: activeTab === 'upload' ? '#0b0b0b' : '#a1a1aa',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Upload size={14} /> Subir Archivo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    background: activeTab === 'url' ? '#eedfc6' : 'transparent',
                    color: activeTab === 'url' ? '#0b0b0b' : '#a1a1aa',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <LinkIcon size={14} /> Enlace URL Directo
                </button>
              </div>

              {/* TAB 1: SUBIR ARCHIVO CON DRAG & DROP */}
              {activeTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="hero-video-input"
                  />

                  {/* Dropzone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: isDragging ? '2.5rem 1.5rem' : '2rem 1.5rem',
                      border: isDragging
                        ? '2px dashed #eedfc6'
                        : fileSizeError
                        ? '2px dashed #ef4444'
                        : selectedFile
                        ? '2px solid #eedfc6'
                        : '2px dashed rgba(255,255,255,0.22)',
                      borderRadius: '12px',
                      background: isDragging
                        ? 'rgba(238, 223, 198, 0.15)'
                        : selectedFile
                        ? 'rgba(238, 223, 198, 0.05)'
                        : '#161616',
                      boxShadow: isDragging ? '0 0 30px rgba(238, 223, 198, 0.35)' : 'none',
                      transform: isDragging ? 'scale(1.015)' : 'scale(1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      textAlign: 'center',
                      position: 'relative',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: isDragging ? '#eedfc6' : 'rgba(238, 223, 198, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.85rem',
                      transition: 'all 0.2s'
                    }}>
                      {isDragging ? (
                        <ArrowDown size={28} color="#0b0b0b" />
                      ) : (
                        <Video size={26} color="#eedfc6" />
                      )}
                    </div>

                    <span className="font-bronco" style={{
                      fontSize: isDragging ? '1.15rem' : '1.05rem',
                      letterSpacing: '0.04em',
                      color: isDragging ? '#eedfc6' : '#ffffff',
                      marginBottom: '0.35rem',
                      transition: 'color 0.2s'
                    }}>
                      {isDragging 
                        ? '¡SUELTA TU VIDEO AQUÍ!' 
                        : selectedFile 
                        ? 'CAMBIAR ARCHIVO SELECCIONADO' 
                        : 'ARRASTRA TU VIDEO O HAZ CLIC AQUÍ'}
                    </span>

                    <span style={{ fontSize: '0.75rem', color: isDragging ? '#ffffff' : '#a1a1aa' }}>
                      {isDragging ? 'Suelta el archivo para cargarlo instantáneamente' : 'Formatos: MP4, WebM, MOV • Peso máximo: 6 MB'}
                    </span>
                  </div>

                  {/* Error si excede 6MB */}
                  {fileSizeError && (
                    <div style={{ padding: '0.85rem 1rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>{fileSizeError}</span>
                    </div>
                  )}

                  {/* Preview del archivo seleccionado antes de subir */}
                  {selectedFile && !fileSizeError && filePreviewUrl && (
                    <div style={{ background: '#161616', border: '1px solid rgba(238, 223, 198, 0.25)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                          <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {selectedFile.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                            ✓ {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB (Dentro del límite de 6 MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setFilePreviewUrl(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Quitar
                        </button>
                      </div>

                      <div style={{ width: '100%', aspectRatio: '16/9', background: '#000000', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                        <video
                          src={filePreviewUrl}
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {uploading && (
                        <div style={{ marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#eedfc6', marginBottom: '0.3rem', fontWeight: 600 }}>
                            <span>Subiendo y activando en Supabase...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#eedfc6', transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleUploadVideo}
                        disabled={uploading}
                        className="font-bronco"
                        style={{
                          width: '100%',
                          padding: '0.85rem',
                          background: '#eedfc6',
                          color: '#0b0b0b',
                          fontWeight: 800,
                          borderRadius: '8px',
                          border: 'none',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          fontSize: '1rem',
                          letterSpacing: '0.04em',
                          boxShadow: '0 4px 15px rgba(238, 223, 198, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          opacity: uploading ? 0.7 : 1
                        }}
                      >
                        {uploading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" /> Subiendo y Activando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} /> Subir y Publicar como Video Activo
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ENLACE DIRECTO (URL) */}
              {activeTab === 'url' && (
                <form onSubmit={handleSaveManualUrl} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#eedfc6', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      URL Directa del Video (.mp4 / .webm)
                    </label>
                    <input
                      type="url"
                      required
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="https://tudominio.com/videos/hero.mp4"
                      style={{
                        width: '100%',
                        padding: '0.8rem 1rem',
                        background: '#161616',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {manualUrl && (
                    <div style={{ width: '100%', aspectRatio: '16/9', background: '#000000', borderRadius: '8px', overflow: 'hidden' }}>
                      <video
                        src={manualUrl}
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploading || !manualUrl.trim()}
                    className="font-bronco"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      background: '#eedfc6',
                      color: '#0b0b0b',
                      fontWeight: 800,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: uploading || !manualUrl.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      letterSpacing: '0.04em',
                      boxShadow: '0 4px 15px rgba(238, 223, 198, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: uploading || !manualUrl.trim() ? 0.6 : 1
                    }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Guardando y Activando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} /> Guardar y Activar Video
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>

          </div>

          {/* SECTION 2: CATÁLOGO DE VIDEOS GUARDADOS */}
          <div style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.75rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={20} color="#eedfc6" />
                  <h2 className="font-bronco" style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                    VIDEOS SUBIDOS ({videos.length})
                  </h2>
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#a1a1aa' }}>
                  Haz clic en &ldquo;Seleccionar como Activo&rdquo; en cualquiera de tus videos previos para ponerlo en portada al instante.
                </p>
              </div>

              <span style={{ fontSize: '0.75rem', color: '#eedfc6', background: 'rgba(238, 223, 198, 0.08)', padding: '0.3rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(238, 223, 198, 0.2)', fontWeight: 600 }}>
                Columna: Video_web.activo (bool)
              </span>
            </div>

            {loadingVideos ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa' }}>
                <Loader2 size={32} className="animate-spin" color="#eedfc6" style={{ margin: '0 auto 1rem auto' }} />
                <span style={{ fontSize: '0.88rem' }}>Cargando catálogo de videos...</span>
              </div>
            ) : videos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#161616', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <Film size={36} color="#71717a" style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1rem' }}>No hay videos guardados todavía</h4>
                <p style={{ margin: '0.4rem 0 0 0', color: '#71717a', fontSize: '0.82rem' }}>
                  Sube tu primer archivo de video en el recuadro superior para comenzar a armar tu catálogo.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem' }}>
                {videos.map((vid) => {
                  const isItemActive = vid.activo;
                  const isActivatingThis = activatingId === vid.id;
                  const isDeletingThis = deletingId === vid.id;

                  return (
                    <div
                      key={vid.id}
                      style={{
                        background: isItemActive ? 'rgba(238, 223, 198, 0.04)' : '#161616',
                        border: isItemActive ? '2px solid #eedfc6' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s',
                        boxShadow: isItemActive ? '0 8px 25px rgba(238, 223, 198, 0.15)' : 'none',
                        position: 'relative'
                      }}
                    >
                      {/* Top Bar inside Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <span className="font-bronco" style={{ fontSize: '1.05rem', color: '#ffffff', letterSpacing: '0.03em' }}>
                          Video #{vid.id}
                        </span>

                        {isItemActive ? (
                          <span style={{ fontSize: '0.65rem', background: '#10b981', color: '#0b0b0b', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            ★ ACTIVO EN WEB
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', color: '#a1a1aa', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 600 }}>
                            Inactivo
                          </span>
                        )}
                      </div>

                      {/* Video Thumbnail Player */}
                      <div style={{ width: '100%', aspectRatio: '16/9', background: '#000000', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.85rem' }}>
                        <video
                          src={vid.link}
                          controls
                          loop
                          muted
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Date & Info */}
                      <div style={{ marginBottom: '0.85rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                        {vid.created_at && (
                          <div style={{ marginBottom: '0.25rem' }}>
                            <span style={{ color: '#71717a' }}>Subido:</span> {new Date(vid.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                          <input
                            type="text"
                            readOnly
                            value={vid.link}
                            style={{ flex: 1, background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: '#71717a', fontSize: '0.7rem', outline: 'none' }}
                          />
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(vid.link); setCopiedId(vid.id); setTimeout(() => setCopiedId(null), 2000); }}
                            title="Copiar URL del video"
                            style={{ background: '#222222', border: '1px solid rgba(255,255,255,0.12)', color: copiedId === vid.id ? '#10b981' : '#ffffff', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {isItemActive ? (
                          <button
                            type="button"
                            disabled
                            style={{
                              flex: 1,
                              padding: '0.65rem',
                              background: '#eedfc6',
                              color: '#0b0b0b',
                              fontWeight: 800,
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '0.8rem',
                              letterSpacing: '0.04em',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              cursor: 'default'
                            }}
                          >
                            <Check size={16} /> Video Actual Activo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetActive(vid.id)}
                            disabled={isActivatingThis || activatingId !== null}
                            style={{
                              flex: 1,
                              padding: '0.65rem',
                              background: 'transparent',
                              color: '#eedfc6',
                              fontWeight: 700,
                              borderRadius: '6px',
                              border: '1px solid #eedfc6',
                              fontSize: '0.8rem',
                              cursor: isActivatingThis || activatingId !== null ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            {isActivatingThis ? (
                              <>
                                <Loader2 size={14} className="animate-spin" /> Activando...
                              </>
                            ) : (
                              <>
                                <PlaySquare size={14} /> Seleccionar como Activo
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(vid.id, isItemActive)}
                          disabled={isDeletingThis}
                          title="Eliminar del catálogo"
                          style={{
                            padding: '0.65rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            borderRadius: '6px',
                            cursor: isDeletingThis ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {isDeletingThis ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: EVENTOS PERSONALIZADOS                          */}
      {/* ======================================================== */}
      {mainTab === 'eventos' && (
        <div>
          {/* Top bar with Add Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem', background: '#121212', padding: '1.25rem 1.5rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={20} color="#eedfc6" />
                <h3 className="font-bronco" style={{ margin: 0, fontSize: '1.35rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                  GESTIÓN DE EVENTOS PERSONALIZADOS ({eventos.length})
                </h3>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#a1a1aa' }}>
                Crea convocatorias, masterclasses, inauguraciones o promociones especiales con fecha de inicio y finalización.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (showEventForm) {
                  resetEventForm();
                } else {
                  resetEventForm();
                  setShowEventForm(true);
                }
              }}
              className="font-bronco"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: showEventForm ? '#222222' : '#eedfc6',
                color: showEventForm ? '#ffffff' : '#0b0b0b',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.9rem',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                boxShadow: showEventForm ? 'none' : '0 4px 15px rgba(238, 223, 198, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              {showEventForm ? (
                <>
                  <X size={16} /> Cancelar Formulario
                </>
              ) : (
                <>
                  <Plus size={16} /> + Añadir Nuevo Evento
                </>
              )}
            </button>
          </div>

          {/* Form to Create or Edit Event */}
          {showEventForm && (
            <div style={{ background: '#141414', border: '1px solid rgba(238, 223, 198, 0.3)', borderRadius: '16px', padding: '2rem', marginBottom: '2.5rem', boxShadow: '0 20px 45px rgba(0,0,0,0.6)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} color="#eedfc6" />
                  <h3 className="font-bronco" style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                    {editingEventId ? 'EDITAR EVENTO' : 'NUEVO EVENTO PERSONALIZADO'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={resetEventForm}
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Title and Event Code */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#eedfc6', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Título del Evento (Opcional)
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Ej. Masterclass Barbería Pro 2026 (opcional)"
                      style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#eedfc6', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Identificador / Código (Opcional)
                    </label>
                    <input
                      type="text"
                      value={eventCode}
                      onChange={(e) => setEventCode(e.target.value)}
                      placeholder="Ej. EVT-MASTERCLASS-2026"
                      style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Dates: Start & End */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#eedfc6', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> Fecha y Hora de Inicio (Opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={eventStartDate}
                      onChange={(e) => setEventStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', colorScheme: 'dark' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#eedfc6', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> Fecha y Hora de Finalización (Opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={eventEndDate}
                      onChange={(e) => setEventEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#eedfc6', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Descripción del Evento (Opcional)
                  </label>
                  <textarea
                    rows={4}
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Detalles sobre el evento, ubicación, instructores, dinámicas y acceso para clientes..."
                    style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.88rem', outline: 'none', resize: 'vertical', lineHeight: 1.4 }}
                  />
                </div>

                {/* Event Image: File Upload / Drag & Drop or URL (OBLIGATORIA) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <ImageIcon size={14} /> Imagen del Evento (Banner / Flyer) *
                    </label>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(238, 223, 198, 0.15)', color: '#eedfc6', border: '1px solid rgba(238, 223, 198, 0.35)', padding: '0.15rem 0.55rem', borderRadius: '4px', fontWeight: 800 }}>
                      CAMPO OBLIGATORIO *
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    
                    {/* Image Dropzone */}
                    <div>
                      <input
                        ref={eventImageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleEventImageChange(file);
                        }}
                        id="event-image-input"
                      />

                      <div
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingEventImage(true); }}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingEventImage(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingEventImage(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingEventImage(false);
                          const f = e.dataTransfer?.files?.[0];
                          if (f) handleEventImageChange(f);
                        }}
                        onClick={() => eventImageInputRef.current?.click()}
                        style={{
                          border: isDraggingEventImage ? '2px dashed #eedfc6' : '2px dashed rgba(255,255,255,0.18)',
                          borderRadius: '10px',
                          padding: '1.5rem 1rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: isDraggingEventImage ? 'rgba(238, 223, 198, 0.1)' : '#1a1a1a',
                          transition: 'all 0.2s'
                        }}
                      >
                        <ImageIcon size={24} color="#eedfc6" style={{ margin: '0 auto 0.4rem auto' }} />
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                          {eventImageFile ? 'Cambiar imagen seleccionada' : 'Arrastra tu imagen o haz clic aquí'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                          PNG, JPG o WebP (Máx 5 MB)
                        </span>
                      </div>
                    </div>

                    {/* Or URL input & Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input
                        type="url"
                        value={eventImageUrl}
                        onChange={(e) => { setEventImageUrl(e.target.value); if (!eventImageFile) setEventImagePreview(e.target.value); }}
                        placeholder="O ingresa enlace directo: https://.../flyer.jpg"
                        style={{ width: '100%', padding: '0.75rem 0.9rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
                      />

                      {eventImagePreview && (
                        <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid rgba(238, 223, 198, 0.25)', position: 'relative' }}>
                          <img
                            src={eventImagePreview}
                            alt="Vista previa evento"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEventImageFile(null);
                              setEventImageUrl('');
                              setEventImagePreview(null);
                              if (eventImageInputRef.current) eventImageInputRef.current.value = '';
                            }}
                            style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ef4444', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Quitar ✕
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={resetEventForm}
                    disabled={savingEvent}
                    style={{ padding: '0.8rem 1.4rem', background: '#222222', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={savingEvent}
                    className="font-bronco"
                    style={{
                      padding: '0.8rem 1.8rem',
                      background: '#eedfc6',
                      border: 'none',
                      color: '#0b0b0b',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      letterSpacing: '0.04em',
                      cursor: savingEvent ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 15px rgba(238, 223, 198, 0.25)',
                      opacity: savingEvent ? 0.7 : 1
                    }}
                  >
                    {savingEvent ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Guardando en Supabase...
                      </>
                    ) : (
                      <>
                        <Check size={16} /> {editingEventId ? 'Guardar Cambios' : 'Publicar Evento'}
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>
          )}

          {/* List of Events */}
          <div style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.75rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="#eedfc6" />
                <h3 className="font-bronco" style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                  LISTADO DE EVENTOS ({eventos.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#eedfc6', background: 'rgba(238, 223, 198, 0.08)', padding: '0.3rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(238, 223, 198, 0.2)', fontWeight: 600 }}>
                Tabla: Eventos
              </span>
            </div>

            {loadingEventos ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#a1a1aa' }}>
                <Loader2 size={32} className="animate-spin" color="#eedfc6" style={{ margin: '0 auto 1rem auto' }} />
                <span style={{ fontSize: '0.88rem' }}>Cargando eventos de la base de datos...</span>
              </div>
            ) : eventos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#161616', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <CalendarDays size={38} color="#71717a" style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1.05rem' }}>No hay eventos registrados</h4>
                <p style={{ margin: '0.4rem 0 1.25rem 0', color: '#71717a', fontSize: '0.85rem' }}>
                  Comienza creando tu primer evento para anunciarlo en la web pública.
                </p>
                <button
                  type="button"
                  onClick={() => { resetEventForm(); setShowEventForm(true); }}
                  className="font-bronco"
                  style={{ padding: '0.7rem 1.5rem', background: '#eedfc6', border: 'none', color: '#0b0b0b', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', letterSpacing: '0.04em' }}
                >
                  + Crear Primer Evento
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {eventos.map((evt) => {
                  const status = getEventStatus(evt.FechaDeEvento, evt.FechaEnQueFinalizo);
                  const isDeletingThis = deletingEventId === evt.id;

                  return (
                    <div
                      key={evt.id}
                      style={{
                        background: '#161616',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        position: 'relative'
                      }}
                    >
                      {/* Banner Image */}
                      <div style={{ width: '100%', height: '170px', background: '#0e0e0e', position: 'relative', overflow: 'hidden' }}>
                        {evt.imagenDeEvento ? (
                          <img
                            src={evt.imagenDeEvento}
                            alt={evt.TituloDeEvento}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#52525b', gap: '0.4rem' }}>
                            <ImageIcon size={32} />
                            <span style={{ fontSize: '0.75rem' }}>Sin imagen adjunta</span>
                          </div>
                        )}

                        {/* Status Badge overlay */}
                        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            letterSpacing: '0.06em',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            background: status.bg,
                            color: status.color,
                            border: `1px solid ${status.border || 'transparent'}`,
                            backdropFilter: 'blur(8px)',
                            textTransform: 'uppercase'
                          }}>
                            {status.label}
                          </span>
                        </div>

                        {evt.IDdeEvento && (
                          <div style={{ position: 'absolute', bottom: '8px', left: '10px' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.75)', color: '#eedfc6', backdropFilter: 'blur(6px)' }}>
                              #{evt.IDdeEvento}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <h4 className="font-bronco" style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#ffffff', letterSpacing: '0.03em', lineHeight: 1.25 }}>
                          {evt.TituloDeEvento?.trim() || 'Evento'}
                        </h4>

                        {/* Dates info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem', fontSize: '0.78rem', color: '#a1a1aa', background: '#111111', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div>
                            <strong style={{ color: '#eedfc6' }}>Inicio:</strong>{' '}
                            {evt.FechaDeEvento
                              ? new Date(evt.FechaDeEvento).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                              : 'No especificada'}
                          </div>
                          <div>
                            <strong style={{ color: '#eedfc6' }}>Finaliza:</strong>{' '}
                            {evt.FechaEnQueFinalizo
                              ? new Date(evt.FechaEnQueFinalizo).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                              : 'No especificada'}
                          </div>
                        </div>

                        {/* Description */}
                        {evt.DescripcionDelEvento && (
                          <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#a1a1aa', lineHeight: 1.45, maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                            {evt.DescripcionDelEvento}
                          </p>
                        )}

                        {/* Card Actions */}
                        <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvent(evt)}
                            style={{
                              flex: 1,
                              padding: '0.6rem',
                              background: 'transparent',
                              border: '1px solid #eedfc6',
                              color: '#eedfc6',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Edit3 size={14} /> Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id, evt.TituloDeEvento)}
                            disabled={isDeletingThis}
                            title="Eliminar evento"
                            style={{
                              padding: '0.6rem 0.85rem',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#ef4444',
                              borderRadius: '6px',
                              cursor: isDeletingThis ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {isDeletingThis ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN MARCAS                                           */}
      {/* ======================================================== */}
      {mainTab === 'marcas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Uploader Card */}
          <div style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.5rem', maxWidth: '640px' }}>
            <h3 className="font-bronco" style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: '#ffffff', letterSpacing: '0.04em' }}>
              SUBIR MARCA
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: '#a1a1aa' }}>
              Logotipos en formato PNG sin fondo. Archivo menor a 500 KB y proporción 1:1.
            </p>

            {/* Dropzone */}
            <div
              onDragOver={handleMarcaDragOver}
              onDragEnter={handleMarcaDragEnter}
              onDragLeave={handleMarcaDragLeave}
              onDrop={handleMarcaDrop}
              onClick={() => marcaFileInputRef.current?.click()}
              style={{
                border: isDraggingMarca ? '2px dashed #eedfc6' : '2px dashed rgba(255,255,255,0.15)',
                background: isDraggingMarca ? 'rgba(238, 223, 198, 0.05)' : '#0b0b0b',
                borderRadius: '10px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '1rem'
              }}
            >
              <input
                ref={marcaFileInputRef}
                type="file"
                accept="image/png,image/webp,image/jpeg,image/svg+xml"
                onChange={handleMarcaFileChange}
                style={{ display: 'none' }}
              />

              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(238, 223, 198, 0.08)', color: '#eedfc6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                <Upload size={20} />
              </div>

              <p style={{ margin: 0, fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>
                {isDraggingMarca ? 'Suelta el logotipo aquí' : 'Haz clic o arrastra el archivo aquí'}
              </p>
              <p style={{ margin: '0.35rem 0 0 0', color: '#71717a', fontSize: '0.75rem' }}>
                PNG sin fondo • Menor a 500 KB • Proporción 1:1
              </p>
            </div>

            {marcaFileSizeError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '0.65rem 0.85rem', color: '#fca5a5', fontSize: '0.78rem', marginBottom: '1rem' }}>
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{marcaFileSizeError}</span>
              </div>
            )}

            {/* Selected File Preview */}
            {selectedMarcaFile && marcaPreviewUrl && !marcaFileSizeError && (
              <div style={{ background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '60px', height: '60px', background: '#161616', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', flexShrink: 0 }}>
                  <img src={marcaPreviewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: '0.8rem' }}>
                  <p style={{ margin: '0 0 0.2rem 0', color: '#ffffff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedMarcaFile.name}
                  </p>
                  <p style={{ margin: 0, color: '#71717a', fontSize: '0.72rem' }}>
                    {(selectedMarcaFile.size / 1024).toFixed(1)} KB {marcaDimensionInfo ? `• ${marcaDimensionInfo.width}×${marcaDimensionInfo.height}px` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMarcaFile(null);
                    setMarcaPreviewUrl(null);
                    setMarcaDimensionInfo(null);
                    if (marcaFileInputRef.current) marcaFileInputRef.current.value = '';
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <X size={14} /> Quitar
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleUploadMarca}
              disabled={uploadingMarca || !selectedMarcaFile || Boolean(marcaFileSizeError)}
              className="font-bronco"
              style={{
                width: '100%',
                padding: '0.8rem',
                background: '#eedfc6',
                color: '#0b0b0b',
                fontWeight: 800,
                borderRadius: '8px',
                border: 'none',
                cursor: uploadingMarca || !selectedMarcaFile || Boolean(marcaFileSizeError) ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: uploadingMarca || !selectedMarcaFile || Boolean(marcaFileSizeError) ? 0.6 : 1
              }}
            >
              {uploadingMarca ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Subiendo...
                </>
              ) : (
                'Subir Marca'
              )}
            </button>
          </div>

          {/* List of Uploaded Brands */}
          <div style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 className="font-bronco" style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: '#ffffff', letterSpacing: '0.04em' }}>
              MARCAS SUBIDAS ({marcasList.length})
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: '#a1a1aa' }}>
              Listado de marcas que se muestran en la web.
            </p>

            {loadingMarcas ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '2rem 0', color: '#a1a1aa' }}>
                <Loader2 size={20} className="animate-spin" color="#eedfc6" />
                <span style={{ fontSize: '0.85rem' }}>Cargando marcas...</span>
              </div>
            ) : marcasList.length === 0 ? (
              <p style={{ margin: 0, color: '#71717a', fontSize: '0.85rem', padding: '1.5rem 0' }}>
                No hay marcas subidas todavía.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                {marcasList.map((marca) => {
                  const isDeletingThis = deletingMarcaId === marca.id;

                  return (
                    <div
                      key={marca.id}
                      style={{
                        background: '#0c0c0c',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.85rem'
                      }}
                    >
                      {/* Logo Thumbnail (1:1) */}
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1/1',
                          background: '#161616',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.75rem',
                          overflow: 'hidden'
                        }}
                      >
                        <img
                          src={marca.marcas}
                          alt={`Marca ${marca.id}`}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteMarca(marca.id)}
                        disabled={isDeletingThis}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#ef4444',
                          borderRadius: '6px',
                          cursor: isDeletingThis ? 'not-allowed' : 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        {isDeletingThis ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Eliminar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
