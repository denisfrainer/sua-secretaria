'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  User, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  DollarSign, 
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { 
  VitrineProfile, 
  VitrineService, 
  VitrinePortfolioItem,
  upsertProfile,
  createService,
  updateService,
  deleteService,
  addPortfolioItem,
  deletePortfolioItem
} from '@/app/dashboard/actions';

interface DashboardPanelProps {
  userId: string;
  initialProfile: VitrineProfile | null;
  initialServices: VitrineService[];
  initialPortfolio: VitrinePortfolioItem[];
}

export default function DashboardPanel({
  userId,
  initialProfile,
  initialServices,
  initialPortfolio
}: DashboardPanelProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'services' | 'portfolio'>('profile');
  const [isPending, startTransition] = useTransition();

  // Status banners
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Form State
  const [profileName, setProfileName] = useState(initialProfile?.name || '');
  const [profileBio, setProfileBio] = useState(initialProfile?.bio || '');
  const [profileWhatsapp, setProfileWhatsapp] = useState(initialProfile?.whatsapp || '');
  const [profileCover, setProfileCover] = useState(initialProfile?.cover_photo_url || '');
  const [profileSlug, setProfileSlug] = useState(initialProfile?.slug || '');

  // Services State
  const [servicesList, setServicesList] = useState<VitrineService[]>(initialServices);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Portfolio State
  const [portfolioList, setPortfolioList] = useState<VitrinePortfolioItem[]>(initialPortfolio);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioCategory, setPortfolioCategory] = useState('Alongamento');

  useEffect(() => {
    console.log('[STOREFRONT_MOUNT] DashboardPanel mounted', { userId, activeTab });
  }, [userId, activeTab]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // ----------------------------------------------------
  // 👤 PROFILE EVENT HANDLERS
  // ----------------------------------------------------
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!profileName || !profileWhatsapp) {
      showError('Nome e WhatsApp são obrigatórios.');
      return;
    }

    startTransition(async () => {
      try {
        await upsertProfile({
          name: profileName,
          bio: profileBio || null,
          whatsapp: profileWhatsapp,
          cover_photo_url: profileCover || null,
          slug: profileSlug || null
        });
        showSuccess('Configurações de perfil atualizadas com sucesso!');
      } catch (err: any) {
        showError(err.message || 'Falha ao salvar o perfil.');
      }
    });
  };

  // ----------------------------------------------------
  // 💅 SERVICES EVENT HANDLERS
  // ----------------------------------------------------
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!serviceTitle || !servicePrice || !serviceDuration) {
      showError('Preencha os campos obrigatórios do serviço.');
      return;
    }

    const priceNum = parseFloat(servicePrice);
    const durationNum = parseInt(serviceDuration, 10);

    if (isNaN(priceNum) || isNaN(durationNum)) {
      showError('Preço e Duração devem conter valores numéricos.');
      return;
    }

    startTransition(async () => {
      try {
        if (editingServiceId) {
          // Update
          await updateService(editingServiceId, {
            title: serviceTitle,
            description: serviceDesc || null,
            price: priceNum,
            duration: durationNum
          });
          
          setServicesList(prev => prev.map(s => 
            s.id === editingServiceId 
              ? { ...s, title: serviceTitle, description: serviceDesc || null, price: priceNum, duration: durationNum } 
              : s
          ));
          showSuccess('Serviço atualizado com sucesso!');
        } else {
          // Create
          await createService({
            title: serviceTitle,
            description: serviceDesc || null,
            price: priceNum,
            duration: durationNum
          });
          
          // Re-fetch or locally append with temporary ID
          setServicesList(prev => [...prev, {
            id: crypto.randomUUID(),
            user_id: userId,
            title: serviceTitle,
            description: serviceDesc || null,
            price: priceNum,
            duration: durationNum
          }]);
          showSuccess('Novo serviço adicionado!');
        }

        // Reset
        setServiceTitle('');
        setServiceDesc('');
        setServicePrice('');
        setServiceDuration('');
        setEditingServiceId(null);
      } catch (err: any) {
        showError(err.message || 'Erro ao salvar serviço.');
      }
    });
  };

  const handleEditClick = (service: VitrineService) => {
    setEditingServiceId(service.id);
    setServiceTitle(service.title);
    setServiceDesc(service.description || '');
    setServicePrice(String(service.price));
    setServiceDuration(String(service.duration));
  };

  const handleCancelEdit = () => {
    setEditingServiceId(null);
    setServiceTitle('');
    setServiceDesc('');
    setServicePrice('');
    setServiceDuration('');
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Deseja realmente excluir este serviço?')) return;

    startTransition(async () => {
      try {
        await deleteService(serviceId);
        setServicesList(prev => prev.filter(s => s.id !== serviceId));
        showSuccess('Serviço removido com sucesso.');
      } catch (err: any) {
        showError(err.message || 'Erro ao remover serviço.');
      }
    });
  };

  // ----------------------------------------------------
  // 📷 PORTFOLIO EVENT HANDLERS
  // ----------------------------------------------------
  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!portfolioUrl) {
      showError('Informe o link da foto de resultado.');
      return;
    }

    startTransition(async () => {
      try {
        await addPortfolioItem({
          image_url: portfolioUrl,
          category: portfolioCategory
        });

        setPortfolioList(prev => [{
          id: crypto.randomUUID(),
          user_id: userId,
          image_url: portfolioUrl,
          category: portfolioCategory
        }, ...prev]);

        setPortfolioUrl('');
        showSuccess('Foto de resultado adicionada com sucesso!');
      } catch (err: any) {
        showError(err.message || 'Erro ao inserir item do portfólio.');
      }
    });
  };

  const handleDeletePortfolio = async (itemId: string) => {
    if (!confirm('Excluir esta foto do seu portfólio?')) return;

    startTransition(async () => {
      try {
        await deletePortfolioItem(itemId);
        setPortfolioList(prev => prev.filter(item => item.id !== itemId));
        showSuccess('Item do portfólio removido.');
      } catch (err: any) {
        showError(err.message || 'Erro ao remover foto.');
      }
    });
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-8 items-start pb-24 md:pb-0">
      {/* Mobile Bottom Tab Bar (hidden on desktop) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/90 backdrop-blur-md border-t border-rose-100/60 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] px-6 py-3 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'text-rose-600 scale-105 font-bold'
              : 'text-slate-400 font-medium'
          }`}
        >
          <User size={20} className={activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] tracking-tight">Perfil</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-all cursor-pointer ${
            activeTab === 'services'
              ? 'text-rose-600 scale-105 font-bold'
              : 'text-slate-400 font-medium'
          }`}
        >
          <Sparkles size={20} className={activeTab === 'services' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] tracking-tight">Serviços</span>
        </button>

        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-all cursor-pointer ${
            activeTab === 'portfolio'
              ? 'text-rose-600 scale-105 font-bold'
              : 'text-slate-400 font-medium'
          }`}
        >
          <ImageIcon size={20} className={activeTab === 'portfolio' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] tracking-tight">Portfólio</span>
        </button>
      </div>

      {/* Desktop Sidebar Navigation (hidden on mobile) */}
      <div className="hidden md:flex w-64 shrink-0 flex-col gap-2 p-2 bg-white rounded-3xl border border-rose-100/50 shadow-sm">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-black transition-all border cursor-pointer w-full text-left ${
            activeTab === 'profile'
              ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-sm'
              : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <User size={16} />
          Perfil Profissional
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-black transition-all border cursor-pointer w-full text-left ${
            activeTab === 'services'
              ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-sm'
              : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Sparkles size={16} />
          Meus Serviços
        </button>

        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-black transition-all border cursor-pointer w-full text-left ${
            activeTab === 'portfolio'
              ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-sm'
              : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <ImageIcon size={16} />
          Portfólio & Galeria
        </button>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 w-full flex flex-col gap-6">
        
        {/* Success/Error Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-2.5 text-sm font-semibold animate-in slide-in-from-top-4 duration-300">
            <CheckCircle className="shrink-0 mt-0.5" size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start gap-2.5 text-sm font-semibold animate-in slide-in-from-top-4 duration-300">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Card Container */}
        <div className="bg-white rounded-3xl border border-rose-100/50 shadow-sm p-6 sm:p-8 relative">
          {isPending && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-3xl">
              <Loader2 className="animate-spin text-rose-600" size={32} />
            </div>
          )}

          {/* TAB 1: PROFILE MANAGEMENT */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Editar Perfil Storefront</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Estes detalhes aparecem diretamente na sua página inicial de portfólio.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Nome Completo / Exibição</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    required
                    placeholder="Ex: Rúbia Nails & Design"
                    className="px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-300"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Celular (WhatsApp)</label>
                  <input
                    type="text"
                    value={profileWhatsapp}
                    onChange={e => setProfileWhatsapp(e.target.value)}
                    required
                    placeholder="Ex: 5541999999999"
                    className="px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-300"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Link da sua Vitrine</label>
                  <div className="flex items-center bg-white border border-slate-200/80 rounded-2xl overflow-hidden focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100 transition-all">
                    <span className="pl-4 pr-1 text-sm font-semibold text-slate-400 select-none">belezap.com/</span>
                    <input
                      type="text"
                      value={profileSlug}
                      onChange={e => {
                        const val = e.target.value;
                        console.log('[STOREFRONT_ACTION] Link field changed:', { slugValue: val });
                        setProfileSlug(val);
                      }}
                      placeholder="Ex: rubia-nails"
                      className="w-full pr-4 py-3 bg-transparent text-sm font-semibold outline-none text-slate-700 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Minibiografia / Apresentação</label>
                  <textarea
                    value={profileBio}
                    onChange={e => setProfileBio(e.target.value)}
                    rows={3}
                    placeholder="Conte sobre sua especialidade (alongamentos em gel, blindagens, nail art minimalistas etc.)..."
                    className="px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-300"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">URL Banner de Capa (Unsplash ou link de imagem)</label>
                  <input
                    type="url"
                    value={profileCover}
                    onChange={e => setProfileCover(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-fit self-end px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm shadow-md shadow-rose-200 active:scale-[0.98] transition-all cursor-pointer mt-4"
              >
                Salvar Configurações
              </button>
            </form>
          )}

          {/* TAB 2: SERVICES CATALOG (CRUD) */}
          {activeTab === 'services' && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Catalogo de Serviços</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Adicione, edite ou remova as técnicas e tratamentos disponíveis em sua Vitrine.
                </p>
              </div>

              {/* Service Form */}
              <form onSubmit={handleSaveService} className="p-5 rounded-2xl bg-rose-50/30 border border-rose-100/50 flex flex-col gap-4">
                <h3 className="text-sm font-black text-slate-800">
                  {editingServiceId ? '📝 Editando Serviço selecionado' : '➕ Adicionar Novo Serviço'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Título do Serviço</label>
                    <input
                      type="text"
                      value={serviceTitle}
                      onChange={e => setServiceTitle(e.target.value)}
                      required
                      placeholder="Ex: Blindagem das Unhas Naturais"
                      className="px-4 py-2 bg-white border border-slate-200/80 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700 placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={servicePrice}
                      onChange={e => setServicePrice(e.target.value)}
                      required
                      placeholder="Ex: 85.00"
                      className="px-4 py-2 bg-white border border-slate-200/80 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700 placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Duração (Minutos)</label>
                    <input
                      type="number"
                      value={serviceDuration}
                      onChange={e => setServiceDuration(e.target.value)}
                      required
                      placeholder="Ex: 60"
                      className="px-4 py-2 bg-white border border-slate-200/80 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700 placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Descrição Opcional</label>
                    <input
                      type="text"
                      value={serviceDesc}
                      onChange={e => setServiceDesc(e.target.value)}
                      placeholder="Ex: Aplicação de gel protetor para unhas naturais não quebrarem"
                      className="px-4 py-2 bg-white border border-slate-200/80 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-2">
                  {editingServiceId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-5 py-2 rounded-xl border border-slate-200 text-slate-500 font-extrabold text-xs cursor-pointer hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-sm hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    {editingServiceId ? 'Atualizar Serviço' : 'Inserir Serviço'}
                  </button>
                </div>
              </form>

              {/* Service List */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <FolderOpen size={16} className="text-slate-400" />
                  Serviços Ativos ({servicesList.length})
                </h3>

                {servicesList.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-rose-50 rounded-2xl text-center text-slate-400 text-sm font-medium">
                    Nenhum serviço inserido ainda.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {servicesList.map(service => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 bg-white border border-rose-50/50 rounded-2xl shadow-sm hover:border-rose-100 transition-all"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="font-bold text-slate-800 truncate">{service.title}</h4>
                          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{service.description || 'Sem descrição'}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs font-black text-slate-700 flex items-center gap-0.5">
                              <DollarSign size={12} className="text-slate-400" />
                              R$ {service.price.toFixed(2)}
                            </span>
                            <span className="text-xs font-black text-slate-500 flex items-center gap-0.5">
                              <Clock size={12} className="text-slate-400" />
                              {service.duration} min
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleEditClick(service)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100/50"
                            title="Editar"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100/50"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PORTFOLIO GALLERY */}
          {activeTab === 'portfolio' && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Galeria de Resultados</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Adicione fotos das suas unhas finalizadas e crie o seu catálogo de inspirações.
                </p>
              </div>

              {/* Portfolio upload url form */}
              <form onSubmit={handleAddPortfolio} className="p-5 rounded-2xl bg-rose-50/30 border border-rose-100/50 flex flex-col gap-4">
                <h3 className="text-sm font-black text-slate-800">➕ Adicionar Foto de Trabalho</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">URL do Item (Unsplash/Link de imagem)</label>
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={e => setPortfolioUrl(e.target.value)}
                      required
                      placeholder="https://images.unsplash.com/photo-..."
                      className="px-4 py-2 bg-white border border-slate-200/80 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700 placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Categoria</label>
                    <select
                      value={portfolioCategory}
                      onChange={e => setPortfolioCategory(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700"
                    >
                      <option value="Alongamento">Alongamento</option>
                      <option value="Nail Art">Nail Art</option>
                      <option value="Blindagem">Blindagem</option>
                      <option value="Esmaltação">Esmaltação</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-fit self-end px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-sm hover:scale-[1.02] transition-all cursor-pointer"
                >
                  Inserir no Portfólio
                </button>
              </form>

              {/* Portfolio list grid */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <ImageIcon size={16} className="text-slate-400" />
                  Galeria ({portfolioList.length})
                </h3>

                {portfolioList.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-rose-50 rounded-2xl text-center text-slate-400 text-sm font-medium">
                    Nenhuma foto cadastrada na galeria.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {portfolioList.map(item => (
                      <div
                        key={item.id}
                        className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm"
                      >
                        <img
                          src={item.image_url}
                          alt="Portfolio item"
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay Category */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/45 backdrop-blur-sm text-[8px] font-black text-white uppercase tracking-wider">
                          {item.category}
                        </div>
                        {/* Overlay Delete */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <button
                            onClick={() => handleDeletePortfolio(item.id)}
                            className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
                            title="Remover Imagem"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
