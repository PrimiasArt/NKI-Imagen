import React, { useState, useEffect, useRef } from 'react';
import { CharacterPersona, BiometricProfile } from '../types';
import {
  getCharacterPersonas,
  saveCharacterPersona,
  deleteCharacterPersona,
  getActivePersonaId,
  setActivePersonaId,
  addPhotoToPersona,
  addPhotosToPersona,
  updatePersonaDetails,
  removePhotoFromPersona,
  setPersonaAvatarPhoto,
  analyzeModelFaceTraits,
  compressFileToBase64
} from '../services/consistencyService';
import { synthesizeMultiPhotoBiometrics } from '../services/biometricCoreService';
import {
  exportCharacterVaultToJson,
  importCharacterVaultFromJson,
  syncCharacterVaultWithGoogleDrive,
  getVaultLastSyncedAt
} from '../services/vaultSyncService';
import { getAccessToken } from '../services/googleService';

interface CharacterVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsBiometricCore?: (imageUrl: string, persona: CharacterPersona) => void;
  initialUploadFile?: File | null;
}

export const CharacterVaultModal: React.FC<CharacterVaultModalProps> = ({
  isOpen,
  onClose,
  onSelectAsBiometricCore,
  initialUploadFile
}) => {
  const [personas, setPersonas] = useState<CharacterPersona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [activePersonaId, setActivePersonaIdState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Female' | 'Male'>('all');

  // Multi-Photo Biometric Synthesis & Consensus State
  const [isSynthesizingBiometrics, setIsSynthesizingBiometrics] = useState(false);
  const [synthesizeStatusText, setSynthesizeStatusText] = useState('');

  // Cross-Device Cloud Sync & Backup State
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [lastSyncedAtState, setLastSyncedAtState] = useState<number | null>(() => getVaultLastSyncedAt());
  const importInputRef = useRef<HTMLInputElement>(null);

  // New Character Creation State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [newPersona, setNewPersona] = useState<Partial<CharacterPersona>>({
    name: '',
    gender: 'Female',
    ageRange: '20-25 tuổi',
    bodyType: 'Thon thả chuẩn người mẫu (Slim Runway)',
    faceFeatures: '',
    hairStyle: '',
    signatureOutfit: '',
    colorPalette: 'Muted charcoal, ivory silk, champagne gold',
    photos: []
  });

  // Selected Persona Edit State
  const [isEditingSelected, setIsEditingSelected] = useState(false);
  const [editingPersonaData, setEditingPersonaData] = useState<Partial<CharacterPersona>>({});
  const [isAnalyzingEditAi, setIsAnalyzingEditAi] = useState(false);

  // Upload Photos to Selected Persona State
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    const list = getCharacterPersonas();
    setPersonas(list);
    const active = getActivePersonaId();
    setActivePersonaIdState(active);
    if (!selectedPersonaId && list.length > 0) {
      setSelectedPersonaId(active || list[0].id);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadData();

    const handleVaultUpdate = () => {
      loadData();
      setLastSyncedAtState(getVaultLastSyncedAt());
    };

    window.addEventListener('nki_personas_updated', handleVaultUpdate);
    window.addEventListener('nki_vault_synced', handleVaultUpdate);

    return () => {
      window.removeEventListener('nki_personas_updated', handleVaultUpdate);
      window.removeEventListener('nki_vault_synced', handleVaultUpdate);
    };
  }, [isOpen]);

  // Handle initial upload file passed in from Biometric Core
  useEffect(() => {
    if (isOpen && initialUploadFile) {
      compressFileToBase64(initialUploadFile).then(compressed => {
        if (compressed) {
          setIsCreatingNew(true);
          setIsEditingSelected(false);
          setNewPersona(prev => ({
            ...prev,
            avatarImage: compressed,
            photos: [compressed]
          }));
          triggerAiAnalysis(compressed);
        }
      }).catch(err => {
        console.error('Lỗi nén ảnh mẫu ban đầu:', err);
      });
    }
  }, [isOpen, initialUploadFile]);

  if (!isOpen) return null;

  const selectedPersona = personas.find(p => p.id === selectedPersonaId) || personas[0];

  const filteredPersonas = personas.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.faceFeatures.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.bodyType && p.bodyType.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchGender = genderFilter === 'all' || p.gender.toLowerCase() === genderFilter.toLowerCase();
    return matchSearch && matchGender;
  });

  const handleSelectCore = (photoUrl?: string) => {
    if (!selectedPersona) return;
    const chosenImage = photoUrl || selectedPersona.avatarImage || (selectedPersona.photos && selectedPersona.photos[0]);
    if (chosenImage && onSelectAsBiometricCore) {
      onSelectAsBiometricCore(chosenImage, selectedPersona);
      onClose();
    }
  };

  const handleToggleActiveLock = (persona: CharacterPersona) => {
    if (activePersonaId === persona.id) {
      setActivePersonaId(null);
      setActivePersonaIdState(null);
    } else {
      setActivePersonaId(persona.id);
      setActivePersonaIdState(persona.id);
    }
    loadData();
  };

  const handleDeletePersona = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa nhân vật mẫu này khỏi kho data?')) {
      const updated = deleteCharacterPersona(id);
      setPersonas(updated);
      if (selectedPersonaId === id) {
        setSelectedPersonaId(updated[0]?.id || null);
      }
      setIsEditingSelected(false);
    }
  };

  // Start editing selected persona
  const handleStartEditing = () => {
    if (!selectedPersona) return;
    setEditingPersonaData({
      name: selectedPersona.name,
      gender: selectedPersona.gender || 'Female',
      ageRange: selectedPersona.ageRange || '',
      bodyType: selectedPersona.bodyType || '',
      faceFeatures: selectedPersona.faceFeatures || '',
      hairStyle: selectedPersona.hairStyle || '',
      signatureOutfit: selectedPersona.signatureOutfit || '',
      colorPalette: selectedPersona.colorPalette || '',
    });
    setIsEditingSelected(true);
  };

  // Save changes to selected persona
  const handleSaveEdit = () => {
    if (!selectedPersona) return;
    if (!editingPersonaData.name?.trim()) {
      alert('Vui lòng nhập tên người mẫu.');
      return;
    }

    try {
      updatePersonaDetails(selectedPersona.id, editingPersonaData);
      const updatedList = getCharacterPersonas();
      setPersonas(updatedList);
      setIsEditingSelected(false);
    } catch (err: any) {
      console.error('Lỗi khi lưu thông tin:', err);
      alert('Không thể cập nhật thông tin: ' + (err?.message || err));
    }
  };

  // Trigger AI trait scan on selected persona avatar during edit
  const handleTriggerEditAiAnalysis = async () => {
    if (!selectedPersona) return;
    const photo = selectedPersona.avatarImage || (selectedPersona.photos && selectedPersona.photos[0]);
    if (!photo) {
      alert('Nhân vật mẫu chưa có ảnh để AI phân tích.');
      return;
    }
    try {
      setIsAnalyzingEditAi(true);
      const traits = await analyzeModelFaceTraits(photo);
      setEditingPersonaData(prev => ({
        ...prev,
        ...traits,
        name: prev.name || traits.name || selectedPersona.name
      }));
    } catch (err) {
      console.error('Lỗi phân tích AI khi chỉnh sửa:', err);
      alert('Không thể phân tích AI ảnh mẫu.');
    } finally {
      setIsAnalyzingEditAi(false);
    }
  };

  // Process & upload multiple files to selected persona safely with client-side compression
  const processAndUploadFiles = async (files: File[]) => {
    if (!selectedPersona || files.length === 0) return;
    setIsUploadingPhotos(true);
    setUploadStatusText(`Đang nén & tối ưu ${files.length} ảnh...`);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadStatusText(`Đang tối ưu ảnh ${i + 1}/${files.length}...`);
        const base64 = await compressFileToBase64(files[i]);
        if (base64) compressedList.push(base64);
      }
      if (compressedList.length > 0) {
        setUploadStatusText(`Đang lưu vào album của ${selectedPersona.name}...`);
        addPhotosToPersona(selectedPersona.id, compressedList);
        const updatedList = getCharacterPersonas();
        setPersonas(updatedList);
      }
    } catch (err: any) {
      console.error('Lỗi upload ảnh vào model:', err);
      alert('Không thể thêm ảnh vào album: ' + (err?.message || err));
    } finally {
      setIsUploadingPhotos(false);
      setUploadStatusText('');
      if (addPhotoInputRef.current) {
        addPhotoInputRef.current.value = '';
      }
    }
  };

  const handleAddPhotosToSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processAndUploadFiles(Array.from(files));
  };

  const handleDropPhotos = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhotos(false);
    if (!selectedPersona) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      processAndUploadFiles(files);
    }
  };

  // Multi-Photo Biometric Consensus Synthesis for an existing model
  const handleSynthesizeMultiPhoto = async (targetPersona?: CharacterPersona) => {
    const persona = targetPersona || selectedPersona;
    if (!persona) return;
    const photos = persona.photos || (persona.avatarImage ? [persona.avatarImage] : []);
    if (photos.length === 0) {
      alert('Vui lòng thêm ít nhất 1 ảnh vào album của người mẫu để đúc kết số liệu.');
      return;
    }

    try {
      setIsSynthesizingBiometrics(true);
      setSynthesizeStatusText(`Đang đối soát & phân tích đa góc chụp từ ${photos.length} ảnh...`);

      const result = await synthesizeMultiPhotoBiometrics(photos, persona.name);
      
      const updatedPersona: CharacterPersona = {
        ...persona,
        ...result.personaTraits,
        biometricProfile: result.biometricProfile,
        biometricAnalysisCount: result.sampleCount,
        biometricConfidence: result.confidenceScore,
        lastBiometricSync: Date.now(),
        updatedAt: Date.now()
      };

      saveCharacterPersona(updatedPersona);
      const updatedList = getCharacterPersonas();
      setPersonas(updatedList);
      
      // Auto-sync with Google Drive if connected in background
      const token = getAccessToken();
      if (token) {
        syncCharacterVaultWithGoogleDrive(token)
          .then(res => setLastSyncedAtState(res.lastSyncedAt || Date.now()))
          .catch(console.warn);
      }
    } catch (err: any) {
      console.error('Lỗi khi đúc kết Biometric:', err);
      alert('Không thể đúc kết số liệu Biometric: ' + (err?.message || err));
    } finally {
      setIsSynthesizingBiometrics(false);
      setSynthesizeStatusText('');
    }
  };

  // Google Drive Cloud Sync Handler
  const handleSyncDrive = async () => {
    const token = getAccessToken();
    if (!token) {
      alert('Chưa kết nối Google Drive. Vui lòng kết nối tài khoản Google Drive ở thanh điều hướng trước khi đồng bộ.');
      return;
    }

    try {
      setIsSyncingDrive(true);
      setSyncStatusMessage('Đang kết nối & đồng bộ với Google Drive...');
      const res = await syncCharacterVaultWithGoogleDrive(token);
      setLastSyncedAtState(res.lastSyncedAt || Date.now());
      setSyncStatusMessage(res.message);
      const updatedList = getCharacterPersonas();
      setPersonas(updatedList);
      setTimeout(() => setSyncStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Lỗi đồng bộ Google Drive:', err);
      alert('Lỗi đồng bộ Google Drive: ' + (err?.message || err));
      setSyncStatusMessage(null);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Export Character Vault to JSON File (Cross-Machine Migration)
  const handleExportVault = () => {
    exportCharacterVaultToJson();
  };

  // Import Character Vault from JSON File
  const handleImportVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsSyncingDrive(true);
      const res = await importCharacterVaultFromJson(file);
      const updatedList = getCharacterPersonas();
      setPersonas(updatedList);
      if (updatedList.length > 0 && !selectedPersonaId) {
        setSelectedPersonaId(updatedList[0].id);
      }
      alert(res.message);
    } catch (err: any) {
      alert('Không thể nạp tệp: ' + (err?.message || err));
    } finally {
      setIsSyncingDrive(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  // Multi-Photo AI Analysis for New Model Creation
  const triggerAiAnalysis = async (photos: string[] | string) => {
    const photoList = Array.isArray(photos) ? photos : [photos];
    if (photoList.length === 0) return;

    try {
      setIsAnalyzingAi(true);
      if (photoList.length > 1) {
        const synthesis = await synthesizeMultiPhotoBiometrics(photoList, newPersona.name);
        setNewPersona(prev => ({
          ...prev,
          ...synthesis.personaTraits,
          name: synthesis.personaTraits.name || prev.name || 'Model ' + (personas.length + 1),
          photos: photoList,
          avatarImage: prev.avatarImage || photoList[0],
          biometricProfile: synthesis.biometricProfile,
          biometricAnalysisCount: synthesis.sampleCount,
          biometricConfidence: synthesis.confidenceScore,
          lastBiometricSync: Date.now()
        }));
      } else {
        const traits = await analyzeModelFaceTraits(photoList[0]);
        setNewPersona(prev => ({
          ...prev,
          ...traits,
          name: traits.name || prev.name || 'Model ' + (personas.length + 1),
          photos: prev.photos?.length ? prev.photos : [photoList[0]],
          avatarImage: prev.avatarImage || photoList[0]
        }));
      }
    } catch (err) {
      console.error('Lỗi phân tích AI:', err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleSaveNewPersona = () => {
    if (!newPersona.name?.trim()) {
      alert('Vui lòng nhập tên nhân vật mẫu.');
      return;
    }

    try {
      const created: CharacterPersona = {
        id: `persona_${Date.now()}`,
        name: newPersona.name.trim(),
        gender: newPersona.gender || 'Female',
        ageRange: newPersona.ageRange || '20-25 tuổi',
        bodyType: newPersona.bodyType || 'Thon thả',
        faceFeatures: newPersona.faceFeatures || 'Nét mặt thanh tú tự nhiên',
        hairStyle: newPersona.hairStyle || 'Tóc đen mượt tự nhiên',
        signatureOutfit: newPersona.signatureOutfit || 'Trang phục thanh lịch hiện đại',
        colorPalette: newPersona.colorPalette || 'Muted tones',
        avatarImage: newPersona.avatarImage,
        photos: newPersona.photos || (newPersona.avatarImage ? [newPersona.avatarImage] : []),
        biometricProfile: newPersona.biometricProfile,
        biometricAnalysisCount: newPersona.biometricAnalysisCount,
        biometricConfidence: newPersona.biometricConfidence,
        lastBiometricSync: newPersona.lastBiometricSync,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false
      };

      saveCharacterPersona(created);
      const updated = getCharacterPersonas();
      setPersonas(updated);
      setSelectedPersonaId(created.id);
      setIsCreatingNew(false);
      setIsEditingSelected(false);
      setNewPersona({
        name: '',
        gender: 'Female',
        ageRange: '20-25 tuổi',
        bodyType: 'Thon thả chuẩn người mẫu (Slim Runway)',
        faceFeatures: '',
        hairStyle: '',
        signatureOutfit: '',
        colorPalette: 'Muted charcoal, ivory silk',
        photos: []
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Auto-sync with Google Drive if connected
      const token = getAccessToken();
      if (token) {
        syncCharacterVaultWithGoogleDrive(token)
          .then(res => setLastSyncedAtState(res.lastSyncedAt || Date.now()))
          .catch(console.warn);
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu nhân vật mới:', err);
      alert('Không thể lưu nhân vật mẫu: ' + (err?.message || err));
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[90vh] bg-slate-900/95 border border-white/20 rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.85)] backdrop-blur-3xl overflow-hidden flex flex-col text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-xl shadow-lg">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-wider uppercase">
                  Kho Data Nhân Vật Mẫu & Biometric Core
                </h2>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                  {personas.length} Models
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Lưu trữ hồ sơ vóc dáng, diện mạo và album ảnh mẫu phục vụ đồng nhất nhân vật Biometric Core
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cloud Sync & File Transfer Actions */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={handleSyncDrive}
                disabled={isSyncingDrive}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                title={lastSyncedAtState ? `Lần đồng bộ Drive gần nhất: ${new Date(lastSyncedAtState).toLocaleString('vi-VN')}` : 'Đồng bộ toàn bộ kho mẫu và dữ liệu Biometric lên Google Drive'}
              >
                {isSyncingDrive ? (
                  <div className="w-3 h-3 rounded-full border border-emerald-300 border-t-transparent animate-spin" />
                ) : (
                  <span>☁️</span>
                )}
                <span>Đồng Bộ Drive</span>
                {lastSyncedAtState && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              <button
                type="button"
                onClick={handleExportVault}
                className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[11px] font-semibold transition flex items-center gap-1"
                title="Xuất toàn bộ data kho mẫu và số liệu biometric ra tệp JSON để chuyển sang máy khác"
              >
                <span>📤</span>
                <span className="hidden sm:inline">Xuất Data</span>
              </button>

              <label
                className="cursor-pointer px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[11px] font-semibold transition flex items-center gap-1"
                title="Nạp data kho mẫu từ tệp JSON của máy khác"
              >
                <span>📥</span>
                <span className="hidden sm:inline">Nhập Data</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={importInputRef}
                  onChange={handleImportVault}
                />
              </label>
            </div>

            <button
              onClick={() => setIsCreatingNew(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
            >
              <span>➕</span>
              <span>Thêm Nhân Vật Mới</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all border border-white/15"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatusMessage && (
          <div className="px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-200 text-xs font-medium flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span>{syncStatusMessage}</span>
            </div>
            <button
              onClick={() => setSyncStatusMessage(null)}
              className="text-white/50 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Body: 2 Columns */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Character List */}
          <div className="w-80 border-r border-white/10 bg-black/30 flex flex-col">
            {/* Filter Bar */}
            <div className="p-3 border-b border-white/10 space-y-2">
              <input
                type="text"
                placeholder="Tìm kiếm người mẫu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
              />
              <div className="flex gap-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setGenderFilter('all')}
                  className={`flex-1 py-1 rounded-lg border transition-all ${
                    genderFilter === 'all'
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('Female')}
                  className={`flex-1 py-1 rounded-lg border transition-all ${
                    genderFilter === 'Female'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                  }`}
                >
                  👩 Nữ
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('Male')}
                  className={`flex-1 py-1 rounded-lg border transition-all ${
                    genderFilter === 'Male'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                  }`}
                >
                  👨 Nam
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {filteredPersonas.map((p) => {
                const isSelected = selectedPersona?.id === p.id;
                const isLocked = activePersonaId === p.id;
                const photoCount = p.photos ? p.photos.length : (p.avatarImage ? 1 : 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedPersonaId(p.id); setIsCreatingNew(false); }}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10'
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/10 text-white/70'
                    }`}
                  >
                    {/* Avatar Thumbnail */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-white/15 flex-shrink-0 relative">
                      {p.avatarImage ? (
                        <img src={p.avatarImage} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          {p.gender === 'Female' ? '👩' : '👨'}
                        </div>
                      )}
                      {isLocked && (
                        <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center text-[7px] text-black font-black">
                          🔒
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{p.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-white/60">
                          📸 {photoCount}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/50 truncate mt-0.5">
                        {p.gender} • {p.ageRange}
                      </div>
                      {p.bodyType && (
                        <div className="text-[9px] text-amber-300/80 truncate font-mono">
                          {p.bodyType}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Character Details / Creation Panel */}
          <div className="flex-1 bg-slate-900/60 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
            {isCreatingNew ? (
              /* CREATE / EDIT FORM */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Thêm Nhân Vật Mẫu Mới Vào Kho Data
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                </div>

                {/* Initial Photo Upload & AI Scan */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 border border-white/20 flex-shrink-0 flex items-center justify-center relative">
                    {newPersona.avatarImage ? (
                      <img src={newPersona.avatarImage} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl text-white/30">📸</span>
                    )}
                    {newPersona.photos && newPersona.photos.length > 1 && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-purple-600/90 text-white font-mono text-[9px] font-bold shadow">
                        +{newPersona.photos.length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5">
                        <span>📤</span>
                        <span>{newPersona.photos && newPersona.photos.length > 0 ? 'Thêm / Đổi Ảnh (Chọn nhiều ảnh)' : 'Tải Ảnh Mẫu (Chọn 1 hoặc nhiều ảnh)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          ref={fileInputRef}
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              try {
                                const fileArr = Array.from(files);
                                const compressedList: string[] = [];
                                for (let i = 0; i < fileArr.length; i++) {
                                  const c = await compressFileToBase64(fileArr[i]);
                                  if (c) compressedList.push(c);
                                }
                                if (compressedList.length > 0) {
                                  const allPhotos = [...(newPersona.photos || []), ...compressedList];
                                  setNewPersona(prev => ({
                                    ...prev,
                                    avatarImage: prev.avatarImage || compressedList[0],
                                    photos: allPhotos
                                  }));
                                  triggerAiAnalysis(allPhotos);
                                }
                              } catch (err) {
                                console.error('Lỗi tối ưu ảnh mẫu:', err);
                              }
                            }
                          }}
                        />
                      </label>

                      {newPersona.photos && newPersona.photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => triggerAiAnalysis(newPersona.photos!)}
                          disabled={isAnalyzingAi}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                        >
                          {isAnalyzingAi ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              <span>AI đang đúc kết đa ảnh ({newPersona.photos.length} ảnh)...</span>
                            </>
                          ) : (
                            <>
                              <span>🧬</span>
                              <span>{newPersona.photos.length > 1 ? `Đúc Kết Biometric Đa Ảnh (${newPersona.photos.length} ảnh)` : 'AI Quét Diện Mạo'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50">
                      💡 Mẹo: Tải lên từ 2-5 ảnh chân dung ở nhiều góc độ (chính diện, góc nghiêng, ánh sáng khác nhau) để AI đúc kết nhân trắc học chuẩn xác nhất!
                    </p>

                    {/* Mini photo thumbnails preview */}
                    {newPersona.photos && newPersona.photos.length > 1 && (
                      <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                        {newPersona.photos.map((p, idx) => (
                          <div 
                            key={idx}
                            onClick={() => setNewPersona(prev => ({ ...prev, avatarImage: p }))}
                            className={`w-9 h-9 rounded-lg overflow-hidden border cursor-pointer transition-all flex-shrink-0 ${
                              newPersona.avatarImage === p ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-white/20 opacity-70 hover:opacity-100'
                            }`}
                            title="Bấm để chọn làm ảnh đại diện"
                          >
                            <img src={p} className="w-full h-full object-cover" alt="thumb" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                      Tên Nhân Vật / Model:
                    </label>
                    <input
                      type="text"
                      value={newPersona.name || ''}
                      onChange={(e) => setNewPersona(p => ({ ...p, name: e.target.value }))}
                      placeholder="VD: Maya Lin, Elena Rostova..."
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                      Giới Tính:
                    </label>
                    <select
                      value={newPersona.gender || 'Female'}
                      onChange={(e) => setNewPersona(p => ({ ...p, gender: e.target.value }))}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="Female">Nữ (Female)</option>
                      <option value="Male">Nam (Male)</option>
                      <option value="Non-binary">Phi nhị giới (Non-binary)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                      Độ Tuổi:
                    </label>
                    <input
                      type="text"
                      value={newPersona.ageRange || ''}
                      onChange={(e) => setNewPersona(p => ({ ...p, ageRange: e.target.value }))}
                      placeholder="VD: 22-25 tuổi, Early 20s..."
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                      Vóc Dáng (Body Type):
                    </label>
                    <input
                      type="text"
                      value={newPersona.bodyType || ''}
                      onChange={(e) => setNewPersona(p => ({ ...p, bodyType: e.target.value }))}
                      placeholder="VD: Thon thả chuẩn người mẫu (Slim Runway), Khỏe khoắn..."
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                    Đặc Điểm Khuôn Mặt (Face Features):
                  </label>
                  <textarea
                    rows={2}
                    value={newPersona.faceFeatures || ''}
                    onChange={(e) => setNewPersona(p => ({ ...p, faceFeatures: e.target.value }))}
                    placeholder="Góc cằm sắc nét, mắt xanh ngọc, sống mũi cao, nốt ruồi duyên..."
                    className="w-full bg-slate-950 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                    Kiểu Tóc (Hair Style):
                  </label>
                  <input
                    type="text"
                    value={newPersona.hairStyle || ''}
                    onChange={(e) => setNewPersona(p => ({ ...p, hairStyle: e.target.value }))}
                    placeholder="Tóc nâu hạt dẻ uốn sóng lơi nhẹ, mái bay..."
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                    Phong Cách Trang Phục & Bảng Màu Đặc Trưng:
                  </label>
                  <input
                    type="text"
                    value={newPersona.signatureOutfit || ''}
                    onChange={(e) => setNewPersona(p => ({ ...p, signatureOutfit: e.target.value }))}
                    placeholder="Áo trench coat thời thượng, lụa satin cao cấp..."
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewPersona}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-amber-500/25"
                  >
                    Lưu Vào Kho Data
                  </button>
                </div>
              </div>
            ) : selectedPersona ? (
              /* SELECTED PERSONA DOSSIER & ALBUM */
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border-2 border-amber-400/40 shadow-xl flex-shrink-0">
                      {selectedPersona.avatarImage ? (
                        <img src={selectedPersona.avatarImage} alt={selectedPersona.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {selectedPersona.gender === 'Female' ? '👩' : '👨'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">{selectedPersona.name}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {selectedPersona.gender} • {selectedPersona.ageRange}
                        </span>
                      </div>
                      <p className="text-xs text-amber-200/80 font-medium mt-0.5">
                        {selectedPersona.bodyType || 'Vóc dáng chuẩn người mẫu'}
                      </p>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {onSelectAsBiometricCore && (
                      <button
                        type="button"
                        onClick={() => handleSelectCore()}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <span>🎯</span>
                        <span>Chọn Làm Biometric Core</span>
                      </button>
                    )}
                    {!isEditingSelected ? (
                      <button
                        type="button"
                        onClick={handleStartEditing}
                        className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                        title="Chỉnh sửa thông tin và diện mạo model"
                      >
                        <span>✏️</span>
                        <span>Chỉnh Sửa</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingSelected(false)}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-xs font-bold transition"
                      >
                        ✕ Hủy Sửa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleActiveLock(selectedPersona)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activePersonaId === selectedPersona.id
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'
                      }`}
                    >
                      <span>{activePersonaId === selectedPersona.id ? '🔒 Đang Khóa' : '🔓 Khóa Nhân Vật'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePersona(selectedPersona.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                      title="Xóa model này"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* EDIT MODE FORM VS DISPLAY DOSSIER */}
                {isEditingSelected ? (
                  <div className="p-4 rounded-3xl bg-slate-950/80 border border-amber-500/30 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">✏️</span>
                        <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                          Chỉnh Sửa Thông Tin Model: {selectedPersona.name}
                        </h4>
                      </div>
                      {(selectedPersona.avatarImage || (selectedPersona.photos && selectedPersona.photos.length > 0)) && (
                        <button
                          type="button"
                          onClick={handleTriggerEditAiAnalysis}
                          disabled={isAnalyzingEditAi}
                          className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-[11px] font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isAnalyzingEditAi ? (
                            <>
                              <div className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              <span>AI đang phân tích...</span>
                            </>
                          ) : (
                            <>
                              <span>🔍</span>
                              <span>AI Quét Lại Diện Mạo</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                          Tên Model:
                        </label>
                        <input
                          type="text"
                          value={editingPersonaData.name || ''}
                          onChange={(e) => setEditingPersonaData(p => ({ ...p, name: e.target.value }))}
                          className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                          Giới Tính:
                        </label>
                        <select
                          value={editingPersonaData.gender || 'Female'}
                          onChange={(e) => setEditingPersonaData(p => ({ ...p, gender: e.target.value }))}
                          className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="Female">Nữ (Female)</option>
                          <option value="Male">Nam (Male)</option>
                          <option value="Non-binary">Phi nhị giới (Non-binary)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                          Độ Tuổi:
                        </label>
                        <input
                          type="text"
                          value={editingPersonaData.ageRange || ''}
                          onChange={(e) => setEditingPersonaData(p => ({ ...p, ageRange: e.target.value }))}
                          className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                          Vóc Dáng (Body Type):
                        </label>
                        <input
                          type="text"
                          value={editingPersonaData.bodyType || ''}
                          onChange={(e) => setEditingPersonaData(p => ({ ...p, bodyType: e.target.value }))}
                          className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                        Đặc Điểm Khuôn Mặt (Face Features):
                      </label>
                      <textarea
                        rows={2}
                        value={editingPersonaData.faceFeatures || ''}
                        onChange={(e) => setEditingPersonaData(p => ({ ...p, faceFeatures: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                          Kiểu Tóc (Hair Style):
                        </label>
                        <input
                          type="text"
                          value={editingPersonaData.hairStyle || ''}
                          onChange={(e) => setEditingPersonaData(p => ({ ...p, hairStyle: e.target.value }))}
                          className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                          Bảng Màu Chủ Đạo:
                        </label>
                        <input
                          type="text"
                          value={editingPersonaData.colorPalette || ''}
                          onChange={(e) => setEditingPersonaData(p => ({ ...p, colorPalette: e.target.value }))}
                          className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                        Trang Phục Đặc Trưng:
                      </label>
                      <input
                        type="text"
                        value={editingPersonaData.signatureOutfit || ''}
                        onChange={(e) => setEditingPersonaData(p => ({ ...p, signatureOutfit: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingSelected(false)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-amber-500/25 flex items-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>Lưu Thay Đổi</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Traits Cards Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                        Đặc điểm khuôn mặt
                      </span>
                      <p className="text-white/80 leading-relaxed">
                        {selectedPersona.faceFeatures}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                        Kiểu tóc & Màu tóc
                      </span>
                      <p className="text-white/80 leading-relaxed">
                        {selectedPersona.hairStyle}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                        Trang phục đặc trưng
                      </span>
                      <p className="text-white/80 leading-relaxed">
                        {selectedPersona.signatureOutfit}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                        Bảng màu chủ đạo
                      </span>
                      <p className="text-amber-200/80 leading-relaxed font-mono">
                        {selectedPersona.colorPalette}
                      </p>
                    </div>
                  </div>
                )}

                {/* 🧬 Multi-Photo Biometric Ground-Truth Consensus Panel */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-950/40 via-black/40 to-slate-900/60 border border-purple-500/30 space-y-3 shadow-xl backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-sm shadow-inner">
                        🧬
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">
                            Số Liệu Nhân Trắc Học Đa Ảnh (Biometric Consensus)
                          </h4>
                          {selectedPersona.biometricProfile ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
                              <span>✓ Đúc kết từ {selectedPersona.biometricAnalysisCount || selectedPersona.photos?.length || 1} ảnh</span>
                              <span className="text-emerald-400">({Math.round((selectedPersona.biometricConfidence || 0.95) * 100)}% Tin Cậy)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                              Chưa đúc kết đa ảnh
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-white/50">
                          {selectedPersona.lastBiometricSync 
                            ? `Đồng bộ lần cuối: ${new Date(selectedPersona.lastBiometricSync).toLocaleString('vi-VN')} • Số liệu bất biến qua đối soát nhiều góc chụp`
                            : 'AI phân tích đối soát tất cả ảnh của model để đúc kết số liệu giải phẫu chuẩn xác nhất'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSynthesizeMultiPhoto()}
                      disabled={isSynthesizingBiometrics || (selectedPersona.photos?.length || 0) === 0}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-500/25 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title="AI sẽ quét và đối soát toàn bộ ảnh trong album của người mẫu này để trích xuất số liệu chuẩn xác nhất"
                    >
                      {isSynthesizingBiometrics ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>{synthesizeStatusText || 'Đang đúc kết...'}</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>{selectedPersona.biometricProfile ? `Đúc Kết Lại (${selectedPersona.photos?.length || 0} ảnh)` : `Đúc Kết Biometric Đa Ảnh (${selectedPersona.photos?.length || 0} ảnh)`}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {selectedPersona.biometricProfile ? (
                    <div className="space-y-2.5 text-xs animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1">
                          <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-wider block">Khuôn Mặt & Xương Hàm</span>
                          <p className="text-white/95 font-semibold text-xs">{selectedPersona.biometricProfile.faceShape}</p>
                          <p className="text-white/60 text-[11px] leading-snug">{selectedPersona.biometricProfile.jawline}</p>
                        </div>

                        <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1">
                          <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-wider block">Mắt, Lông Mày & Mũi</span>
                          <p className="text-white/95 font-semibold text-xs">{selectedPersona.biometricProfile.eyes.shape} • {selectedPersona.biometricProfile.eyes.color}</p>
                          <p className="text-white/60 text-[11px] leading-snug">{selectedPersona.biometricProfile.nose}</p>
                        </div>

                        <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1">
                          <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-wider block">Môi, Tóc & Sắc Tố Da</span>
                          <p className="text-white/95 font-semibold text-xs">{selectedPersona.biometricProfile.lips}</p>
                          <p className="text-amber-300/80 text-[11px] font-mono leading-snug">Undertone: {selectedPersona.biometricProfile.undertone}</p>
                        </div>
                      </div>

                      {/* Diffusion Prompt Conditioning Descriptor */}
                      <div className="p-3 rounded-2xl bg-black/60 border border-purple-500/20 text-[11px] text-white/75 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-300 font-bold uppercase tracking-wider text-[9.5px]">Chỉ Thị Biometric Diffusion Anchor:</span>
                          <span className="text-[9px] text-white/40 font-mono">Đồng bộ mọi máy qua Drive / JSON</span>
                        </div>
                        <p className="font-mono text-purple-100/90 leading-relaxed text-[10.5px]">
                          {selectedPersona.biometricProfile.summaryDescriptor}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💡</span>
                        <span>Người mẫu này chưa có số liệu nhân trắc học đúc kết đa ảnh. Hãy nhấn <b>"Đúc Kết Biometric Đa Ảnh"</b> để AI tổng hợp từ tất cả góc chụp ({selectedPersona.photos?.length || 0} ảnh) thành bộ thông số chuẩn xác nhất.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo Gallery (Kho Ảnh Của Model) */}
                <div 
                  className={`space-y-3 pt-2 rounded-2xl transition-all ${
                    isDraggingPhotos ? 'p-3 bg-purple-500/10 border-2 border-dashed border-purple-400' : ''
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingPhotos(true); }}
                  onDragLeave={() => setIsDraggingPhotos(false)}
                  onDrop={handleDropPhotos}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📸</span>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        Album Ảnh Của Model ({selectedPersona.photos?.length || 0} ảnh)
                      </h4>
                      <span className="text-[10px] text-white/40 hidden sm:inline">
                        (Kéo thả ảnh vào đây)
                      </span>
                    </div>

                    <label className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                      isUploadingPhotos
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500/30 cursor-not-allowed opacity-60'
                        : 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30 text-purple-200'
                    }`}>
                      {isUploadingPhotos ? (
                        <>
                          <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>{uploadStatusText || 'Đang xử lý...'}</span>
                        </>
                      ) : (
                        <>
                          <span>➕</span>
                          <span>Thêm Ảnh Vào Album</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            ref={addPhotoInputRef}
                            onChange={handleAddPhotosToSelected}
                            disabled={isUploadingPhotos}
                          />
                        </>
                      )}
                    </label>
                  </div>

                  {/* Uploading Status Banner */}
                  {isUploadingPhotos && (
                    <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center gap-2 text-xs text-purple-200 animate-pulse">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-300 border-t-transparent animate-spin flex-shrink-0" />
                      <span>{uploadStatusText}</span>
                    </div>
                  )}

                  {/* Photos Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedPersona.photos && selectedPersona.photos.length > 0 ? (
                      selectedPersona.photos.map((photo, idx) => {
                        const isAvatar = selectedPersona.avatarImage === photo;
                        return (
                          <div
                            key={idx}
                            className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/15 bg-black/40 shadow-md hover:border-amber-400 transition-all"
                          >
                            <img src={photo} alt={`model-${idx}`} className="w-full h-full object-cover" />
                            
                            {isAvatar && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-black font-black text-[9px] shadow-lg">
                                AVATAR
                              </span>
                            )}

                            {/* Hover Actions Overlay */}
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 gap-1.5">
                              {onSelectAsBiometricCore && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectCore(photo)}
                                  className="w-full py-1.5 px-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-[10px] transition-colors"
                                >
                                  🎯 Dùng Làm Core
                                </button>
                              )}
                              {!isAvatar && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPersonaAvatarPhoto(selectedPersona.id, photo);
                                    setPersonas(getCharacterPersonas());
                                  }}
                                  className="w-full py-1 px-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[10px] transition-colors"
                                >
                                  ⭐ Đặt Làm Avatar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  removePhotoFromPersona(selectedPersona.id, idx);
                                  setPersonas(getCharacterPersonas());
                                }}
                                className="w-full py-1 px-2 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-200 font-semibold text-[10px] transition-colors"
                              >
                                🗑️ Xóa Ảnh
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 text-center space-y-2">
                        <span className="text-3xl text-white/20">📷</span>
                        <p className="text-xs text-white/50">Model này chưa có ảnh trong album.</p>
                        <p className="text-[11px] text-white/30">Kéo thả ảnh vào đây hoặc bấm "Thêm Ảnh Vào Album" ở góc phải để thêm ảnh.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/40 text-xs">
                Chưa có nhân vật mẫu nào được chọn.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
