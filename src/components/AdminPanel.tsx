import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Lock, 
  Mail,
  Trash2, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  LogOut, 
  MapPin, 
  Smartphone, 
  BarChart3,
  CheckCircle,
  Settings,
  AlertTriangle,
  Info,
  Edit3
} from 'lucide-react';
import { PROTEIN_LABELS } from '../constants';
import { MenuItem, SavedOrder, BasicIngredientConfig, ExtraConfig, NeighborhoodFee } from '../types';
import logoImg from '../../assets/logo.png';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

interface AdminPanelProps {
  onClose: () => void;
  disabledItems: string[];
  onToggleDisabledItem: (itemKey: string) => void;
  onLoginSuccess?: () => void;
  onLogout?: () => void;
  hotDogsMenu: MenuItem[];
  drinksMenu: MenuItem[];
  onUpdateHotDogsMenu: (menu: MenuItem[]) => void;
  onUpdateDrinksMenu: (menu: MenuItem[]) => void;
  basicIngredients: BasicIngredientConfig[];
  extrasConfig: ExtraConfig[];
  onUpdateBasicIngredients: (ingredients: BasicIngredientConfig[]) => void;
  onUpdateExtrasConfig: (extras: ExtraConfig[]) => void;
  orders: SavedOrder[];
  onConfirmOrder: (orderId: string) => void;
  onUnconfirmOrder: (orderId: string) => void;
  onMarkAsDelivered: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onClearAllOrders: () => void;
  deliveryFees: NeighborhoodFee[];
  onUpdateDeliveryFees: (fees: NeighborhoodFee[]) => void;
}

const DEFAULT_BASIC_INGREDIENTS: BasicIngredientConfig[] = [
  { id: 'milhoErvilha', name: 'Milho & Ervilha Dupla', description: 'Docinho e crocante' },
  { id: 'vinagrete', name: 'Vinagrete Picadinho', description: 'Tomate fresco e cebola' },
  { id: 'cenoura', name: 'Cenoura Raladinha', description: 'Fina e nutritiva' },
  { id: 'batataPalha', name: 'Batata Palha Crocante', description: 'Sempre fresquinha' },
];

const DEFAULT_EXTRAS: ExtraConfig[] = [
  { id: 'queijo', name: 'Queijo Muçarela', price: 3.00, description: 'Derretido na chapa' },
  { id: 'molhoEspecial', name: 'Molho Especial', price: 1.50, description: 'Receita secreta da casa' },
  { id: 'molhoVerde', name: 'Molho Verde', price: 1.50, description: 'Sabor marcante' },
  { id: 'molhoBarbecue', name: 'Molho Barbecue', price: 1.50, description: 'Defumado e adocicado' },
];

export default function AdminPanel({ 
  onClose, 
  disabledItems, 
  onToggleDisabledItem, 
  onLoginSuccess, 
  onLogout,
  hotDogsMenu,
  drinksMenu,
  onUpdateHotDogsMenu,
  onUpdateDrinksMenu,
  basicIngredients,
  extrasConfig,
  onUpdateBasicIngredients,
  onUpdateExtrasConfig,
  orders,
  onConfirmOrder,
  onUnconfirmOrder,
  onMarkAsDelivered,
  onDeleteOrder,
  onClearAllOrders,
  deliveryFees,
  onUpdateDeliveryFees
}: AdminPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');

  // Monitora o estado de autenticação do administrador no Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setIsLoggedIn(false);
      }
    });
    return () => unsubscribe();
  }, [onLoginSuccess]);
  const [activeSubTab, setActiveSubTab] = useState<'pedidos' | 'cardapio' | 'estatisticas' | 'config'>('pedidos');
  const [ordersFilter, setOrdersFilter] = useState<'pending' | 'confirmed' | 'delivered'>('pending');

  // Configuração da Chave Pix do Estabelecimento
  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [isSavingPix, setIsSavingPix] = useState(false);

  // Carrega configurações da chave Pix
  useEffect(() => {
    if (!isLoggedIn) return;
    const loadPixConfig = async () => {
      try {
        const pixSnap = await getDoc(doc(db, 'config', 'pix_key'));
        if (pixSnap.exists()) {
          const data = pixSnap.data();
          setPixKey(data.key || '');
          setPixName(data.name || '');
          setPixCity(data.city || '');
        }
      } catch (err) {
        console.error('Erro ao carregar chave Pix:', err);
      }
    };
    loadPixConfig();
  }, [isLoggedIn]);

  const handleSavePixConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPix(true);
    try {
      await setDoc(doc(db, 'config', 'pix_key'), {
        key: pixKey.trim(),
        name: pixName.trim(),
        city: pixCity.trim(),
      });
      alert('Chave Pix atualizada com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar chave Pix:', err);
      alert('Erro ao salvar chave Pix. Tente novamente.');
    } finally {
      setIsSavingPix(false);
    }
  };



  // Inline editing state for Cardápio tab
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // State for extras editing
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [editExtraName, setEditExtraName] = useState('');
  const [editExtraPrice, setEditExtraPrice] = useState('');
  const [editExtraDescription, setEditExtraDescription] = useState('');

  // State for basic ingredients editing
  const [editingBasicId, setEditingBasicId] = useState<string | null>(null);
  const [editBasicName, setEditBasicName] = useState('');
  const [editBasicDescription, setEditBasicDescription] = useState('');

  // State for delivery fees editing
  const [editingDeliveryFeeId, setEditingDeliveryFeeId] = useState<string | null>(null);
  const [editDeliveryFeeName, setEditDeliveryFeeName] = useState('');
  const [editDeliveryFeeAmount, setEditDeliveryFeeAmount] = useState('');

  const startEditing = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditDescription(item.description);
  };

  const startEditingExtra = (item: ExtraConfig) => {
    setEditingExtraId(item.id);
    setEditExtraName(item.name);
    setEditExtraPrice(item.price.toString());
    setEditExtraDescription(item.description);
  };

  const startEditingBasic = (item: BasicIngredientConfig) => {
    setEditingBasicId(item.id);
    setEditBasicName(item.name);
    setEditBasicDescription(item.description);
  };

  const saveItem = (id: string, isDrink: boolean) => {
    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Por favor, insira um preço válido.');
      return;
    }
    if (!editName.trim()) {
      alert('O nome do item não pode ser vazio.');
      return;
    }
    
    if (isDrink) {
      const updated = drinksMenu.map(item => 
        item.id === id ? { ...item, name: editName.trim(), price: priceNum, description: editDescription.trim() } : item
      );
      onUpdateDrinksMenu(updated);
    } else {
      const updated = hotDogsMenu.map(item => 
        item.id === id ? { ...item, name: editName.trim(), price: priceNum, description: editDescription.trim() } : item
      );
      onUpdateHotDogsMenu(updated);
    }
    setEditingItemId(null);
  };

  const saveExtra = (id: string) => {
    const priceNum = parseFloat(editExtraPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Por favor, insira um preço válido.');
      return;
    }
    if (!editExtraName.trim()) {
      alert('O nome do item não pode ser vazio.');
      return;
    }

    const updated = extrasConfig.map(item =>
      item.id === id ? { ...item, name: editExtraName.trim(), price: priceNum, description: editExtraDescription.trim() } : item
    );
    onUpdateExtrasConfig(updated);
    setEditingExtraId(null);
  };

  const saveBasic = (id: string) => {
    if (!editBasicName.trim()) {
      alert('O nome do item não pode ser vazio.');
      return;
    }

    const updated = basicIngredients.map(item =>
      item.id === id ? { ...item, name: editBasicName.trim(), description: editBasicDescription.trim() } : item
    );
    onUpdateBasicIngredients(updated);
    setEditingBasicId(null);
  };

  const startEditingDeliveryFee = (item: NeighborhoodFee) => {
    setEditingDeliveryFeeId(item.id);
    setEditDeliveryFeeName(item.name);
    setEditDeliveryFeeAmount(item.fee.toString());
  };

  const saveDeliveryFee = (id: string) => {
    const feeNum = parseFloat(editDeliveryFeeAmount);
    if (isNaN(feeNum) || feeNum < 0) {
      alert('Por favor, insira uma taxa válida.');
      return;
    }
    if (!editDeliveryFeeName.trim()) {
      alert('O nome do bairro não pode ser vazio.');
      return;
    }

    const updated = deliveryFees.map(item =>
      item.id === id ? { ...item, name: editDeliveryFeeName.trim(), fee: feeNum } : item
    );
    onUpdateDeliveryFees(updated);
    setEditingDeliveryFeeId(null);
  };

  const getProteinLabel = (type: string) => {
    if (type.includes('_')) {
      const parts = type.split('_');
      const p1 = hotDogsMenu.find(h => h.id === parts[0])?.name || parts[0];
      const p2 = hotDogsMenu.find(h => h.id === parts[1])?.name || parts[1];
      return `Misto (${p1} & ${p2})`;
    }
    return hotDogsMenu.find(h => h.id === type)?.name || type;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error('Erro ao fazer login:', err);
      if (
        err.code === 'auth/invalid-email' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('E-mail ou senha incorretos! Tente novamente.');
      } else {
        setError('Erro de conexão ou login. Verifique seus dados.');
      }
      setPassword('');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (onLogout) {
        onLogout();
      }
      onClose();
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const confirmOrder = (orderId: string) => {
    onConfirmOrder(orderId);
  };

  const unconfirmOrder = (orderId: string) => {
    onUnconfirmOrder(orderId);
  };

  const markAsDelivered = (orderId: string) => {
    onMarkAsDelivered(orderId);
  };

  const deleteOrder = (orderId: string) => {
    if (window.confirm('Deseja realmente excluir este pedido do histórico?')) {
      onDeleteOrder(orderId);
    }
  };

  const clearAllOrders = () => {
    if (window.confirm('ATENÇÃO: Isso apagará TODO o histórico de pedidos permanentemente. Continuar?')) {
      onClearAllOrders();
    }
  };

  // Calculations for stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalOrdersCount = orders.length;
  const averageTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  // Breakdown metrics
  const boiCount = orders.reduce((sum, o) => sum + o.hotDogs.reduce((s, h) => s + (h.type.includes('boi') ? h.quantity : 0), 0), 0);
  const frangoCount = orders.reduce((sum, o) => sum + o.hotDogs.reduce((s, h) => s + (h.type.includes('frango') ? h.quantity : 0), 0), 0);
  const calabresaCount = orders.reduce((sum, o) => sum + o.hotDogs.reduce((s, h) => s + (h.type.includes('calabresa') ? h.quantity : 0), 0), 0);
  const totalDogs = boiCount + frangoCount + calabresaCount;

  const deliveryCount = orders.filter(o => o.orderType === 'entrega').length;
  const pickupCount = orders.filter(o => o.orderType === 'retirada').length;

  const pixCount = orders.filter(o => o.paymentMethod === 'pix').length;
  const creditCount = orders.filter(o => o.paymentMethod === 'cartao_credito').length;
  const debitCount = orders.filter(o => o.paymentMethod === 'cartao_debito').length;
  const cashCount = orders.filter(o => o.paymentMethod === 'dinheiro').length;

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-3xl border border-stone-200 shadow-xl relative overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-amber/5 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-6 relative z-10">
          <img 
            src={logoImg} 
            alt="Divino Lanches Logo" 
            className="w-16 h-16 object-contain rounded-2xl mx-auto mb-4 shadow-lg border border-slate-100" 
          />
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Acesso Administrativo</h2>
          <p className="text-xs text-slate-400 mt-1">Identifique-se para ver o painel de pedidos</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Digite seu e-mail" 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-colors"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">Senha de Acesso</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite sua senha" 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-colors font-mono"
                required
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            className="w-full bg-brand-red hover:bg-brand-red-dark text-white text-xs font-black py-3 rounded-xl shadow-md transition-colors uppercase tracking-wider cursor-pointer"
          >
            Entrar no Painel
          </button>
          
          <button 
            type="button" 
            onClick={onClose}
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-650 text-xs font-bold py-3 rounded-xl transition-colors uppercase tracking-wider border border-slate-200 cursor-pointer"
          >
            Voltar para o Cardápio
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden my-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-brand-red to-brand-red-dark p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={logoImg} 
            alt="Divino Lanches Logo" 
            className="w-10 h-10 object-contain rounded-xl border border-white/10" 
          />
          <div>
            <h2 className="font-black text-sm md:text-base uppercase tracking-tight">Painel Admin</h2>
            <p className="text-[10px] text-red-200 font-bold uppercase tracking-wider leading-none mt-1">Sessão Segura Ativa</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-1.5 bg-black/20 hover:bg-black/45 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/10 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1.5 overflow-x-auto flex-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        <button
          onClick={() => { setActiveSubTab('pedidos'); setOrdersFilter('pending'); }}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative shrink-0 min-w-[130px] sm:min-w-0 sm:flex-1 snap-center ${
            activeSubTab === 'pedidos'
              ? 'bg-brand-charcoal text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Pedidos ({totalOrdersCount})</span>
          {orders.some(o => !o.confirmed) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('cardapio')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 min-w-[110px] sm:min-w-0 sm:flex-1 snap-center ${
            activeSubTab === 'cardapio'
              ? 'bg-brand-charcoal text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Cardápio</span>
        </button>
        <button
          onClick={() => setActiveSubTab('estatisticas')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 min-w-[125px] sm:min-w-0 sm:flex-1 snap-center ${
            activeSubTab === 'estatisticas'
              ? 'bg-brand-charcoal text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Estatísticas</span>
        </button>
        <button
          onClick={() => setActiveSubTab('config')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 min-w-[105px] sm:min-w-0 sm:flex-1 snap-center ${
            activeSubTab === 'config'
              ? 'bg-brand-charcoal text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Ajustes</span>
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="p-5">
        
        {/* SUBTAB 1: LISTA DE PEDIDOS */}
        {activeSubTab === 'pedidos' && (
          <div className="space-y-4">
            
            {/* Quick Cards Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Faturamento</span>
                <span className="text-sm md:text-base font-black font-mono text-slate-800 block mt-1">R$ {totalRevenue.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pedidos</span>
                <span className="text-sm md:text-base font-black font-mono text-slate-800 block mt-1">{totalOrdersCount}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
                <span className="text-sm md:text-base font-black font-mono text-slate-800 block mt-1">R$ {averageTicket.toFixed(2)}</span>
              </div>
            </div>

            {/* Filtro: Pendentes / Confirmados / Finalizados */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setOrdersFilter('pending')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  ordersFilter === 'pending'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Pendentes ({orders.filter(o => !o.confirmed).length})
              </button>
              <button
                onClick={() => setOrdersFilter('confirmed')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  ordersFilter === 'confirmed'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Confirmados ({orders.filter(o => o.confirmed === true && !o.delivered).length})
              </button>
              <button
                onClick={() => setOrdersFilter('delivered')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  ordersFilter === 'delivered'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Finalizados ({orders.filter(o => o.delivered === true).length})
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <Info className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Histórico vazio</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Os pedidos finalizados pelo WhatsApp aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Botão Limpar Tudo */}
                <div className="flex justify-end">
                  <button 
                    onClick={clearAllOrders}
                    className="text-[10px] text-red-500 hover:text-red-750 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar Tudo
                  </button>
                </div>

                {/* Lista filtrada */}
                {(() => {
                  const filterMode = ordersFilter;
                  const filteredOrders = orders.filter(o => {
                    if (filterMode === 'pending') return !o.confirmed;
                    if (filterMode === 'confirmed') return o.confirmed === true && !o.delivered;
                    if (filterMode === 'delivered') return o.delivered === true;
                    return false;
                  });
                  
                  if (filteredOrders.length === 0) {
                    const label = filterMode === 'pending' ? 'pendente' : filterMode === 'confirmed' ? 'confirmado' : 'finalizado';
                    return (
                      <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-200/50">
                        <p className="text-xs font-bold text-slate-400">
                          Nenhum pedido {label} no momento.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                      {filteredOrders.map((o) => (
                        <div key={o.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs relative text-left">
                          {/* Top Order header */}
                          <div className="flex items-start justify-between border-b border-slate-200/50 pb-2 mb-2.5">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] bg-slate-200 text-slate-700 font-bold font-mono px-2 py-0.5 rounded-sm uppercase tracking-wider">
                                  {o.id}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                  {new Date(o.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <h4 className="font-extrabold text-xs text-slate-800 mt-1 capitalize">{o.customerName}</h4>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                                o.orderType === 'entrega' 
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {o.orderType === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}
                              </span>
                              <button 
                                onClick={() => deleteOrder(o.id)}
                                className="text-slate-400 hover:text-red-550 p-1 transition-colors cursor-pointer"
                                title="Excluir do Histórico"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Order detail lists */}
                          <div className="space-y-1.5 text-[11px] text-slate-650">
                            {o.hotDogs.map((dog, i) => (
                              <p key={i} className="leading-snug">
                                🌭 <strong>{dog.quantity}x Dog de {getProteinLabel(dog.type)}</strong> - R$ {(dog.price * dog.quantity).toFixed(2)}
                                <br />
                                <span className="text-[9.5px] text-slate-450 italic ml-4 block">{dog.details}</span>
                              </p>
                            ))}
                            {o.drinks.map((dr, i) => (
                              <p key={i}>
                                <strong>{dr.quantity}x {dr.name}</strong> - R$ {(dr.price * dr.quantity).toFixed(2)}
                              </p>
                            ))}
                          </div>

                          {/* Address details if delivery */}
                          {o.orderType === 'entrega' && (
                            <div className="bg-white p-2 rounded-xl border border-slate-100 text-[10px] text-slate-500 mt-2 flex items-start gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <strong>Endereço:</strong> {o.street}, Nº {o.num} - {o.neighborhood}
                                {o.reference && <span> (Ref: {o.reference})</span>}
                              </div>
                            </div>
                          )}

                          {/* Bottom Order payment details */}
                          <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 mt-2.5 text-[10px] text-slate-500">
                            <div>
                              <strong>Pagamento:</strong> {o.paymentMethod.toUpperCase().replace('_', ' ')}
                              {o.changeFor && <span> (Troco p/ R$ {o.changeFor})</span>}
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 font-mono block">
                                {new Date(o.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <strong className="text-xs font-mono font-bold text-red-650 block mt-0.5">
                                R$ {o.grandTotal.toFixed(2)}
                              </strong>
                            </div>
                          </div>

                          {/* Confirm / Unconfirm / Finalizar Button */}
                          <div className="mt-3 pt-2 border-t border-slate-200/50 flex justify-end gap-2">
                            {filterMode === 'pending' && (
                              <button
                                onClick={() => confirmOrder(o.id)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Confirmar Pedido
                              </button>
                            )}
                            {filterMode === 'confirmed' && (
                              <>
                                <button
                                  onClick={() => unconfirmOrder(o.id)}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Reabrir
                                </button>
                                {!o.delivered && (
                                  <button
                                    onClick={() => markAsDelivered(o.id)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Finalizar Pedido
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB CARDAPIO: EDITAR CARDAPIO */}
        {activeSubTab === 'cardapio' && (
          <div className="space-y-5 text-left">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4">
              <Edit3 className="w-4 h-4 text-brand-red" />
              Editar Cardápio (Itens e Descrições)
            </h3>

            {/* SECTION 1: HOT DOGS */}
            <div className="space-y-3 mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cachorros-Quentes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hotDogsMenu.map((item) => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <div key={item.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left relative flex flex-col justify-between">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 uppercase">Nome</label>
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={e => setEditName(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red font-bold text-slate-800"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-450 uppercase">Preço (R$)</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={editPrice} 
                                onChange={e => setEditPrice(e.target.value)}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red font-mono font-bold text-slate-800"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 uppercase">Descrição</label>
                            <textarea 
                              value={editDescription} 
                              onChange={e => setEditDescription(e.target.value)}
                              rows={2}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red text-slate-700"
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button 
                              onClick={() => setEditingItemId(null)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-600"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => saveItem(item.id, false)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-extrabold text-xs text-slate-800">{item.name}</h5>
                              <span className="font-mono text-xs font-bold text-brand-red">R$ {item.price.toFixed(2)}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight mb-3">{item.description}</p>
                          </div>
                          <div className="flex justify-end mt-auto pt-2 border-t border-slate-100/50">
                            <button 
                              onClick={() => startEditing(item)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-655"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: INGREDIENTES BÁSICOS */}
            <div className="space-y-3 mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ingredientes Básicos (Passo 2)</h4>
              <p className="text-[10.5px] text-slate-500 -mt-1">Itens inclusos no preço base do dogão. Edite nomes e descrições.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {basicIngredients.map((item) => {
                  const isEditing = editingBasicId === item.id;
                  return (
                    <div key={item.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left relative flex flex-col justify-between">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 uppercase">Nome</label>
                            <input 
                              type="text" 
                              value={editBasicName} 
                              onChange={e => setEditBasicName(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 uppercase">Descrição</label>
                            <textarea 
                              value={editBasicDescription} 
                              onChange={e => setEditBasicDescription(e.target.value)}
                              rows={2}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red text-slate-700"
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button 
                              onClick={() => setEditingBasicId(null)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-600"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => saveBasic(item.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-extrabold text-xs text-slate-800">{item.name}</h5>
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">Grátis</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight mb-3">{item.description}</p>
                          </div>
                          <div className="flex justify-end mt-auto pt-2 border-t border-slate-100/50">
                            <button 
                              onClick={() => startEditingBasic(item)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-655"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: EXTRAS & MOLHOS */}
            <div className="space-y-3 mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Extras & Molhos (Passo 2)</h4>
              <p className="text-[10.5px] text-slate-500 -mt-1">Adicionais que podem ser incluídos no dogão por um valor extra.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {extrasConfig.map((item) => {
                  const isEditing = editingExtraId === item.id;
                  return (
                    <div key={item.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left relative flex flex-col justify-between">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 uppercase">Nome</label>
                            <input 
                              type="text" 
                              value={editExtraName} 
                              onChange={e => setEditExtraName(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red font-bold text-slate-800"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-450 uppercase">Preço (R$)</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={editExtraPrice} 
                                onChange={e => setEditExtraPrice(e.target.value)}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red font-mono font-bold text-slate-800"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 uppercase">Descrição</label>
                            <textarea 
                              value={editExtraDescription} 
                              onChange={e => setEditExtraDescription(e.target.value)}
                              rows={2}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red text-slate-700"
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button 
                              onClick={() => setEditingExtraId(null)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-600"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => saveExtra(item.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-extrabold text-xs text-slate-800">{item.name}</h5>
                              <span className="font-mono text-xs font-bold text-brand-red">R$ {item.price.toFixed(2)}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight mb-3">{item.description}</p>
                          </div>
                          <div className="flex justify-end mt-auto pt-2 border-t border-slate-100/50">
                            <button 
                              onClick={() => startEditingExtra(item)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-655"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: DRINKS */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bebidas (Passo 3)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {drinksMenu.map((item) => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <div key={item.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left relative flex flex-col justify-between">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-455 uppercase">Nome</label>
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={e => setEditName(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red font-bold text-slate-800"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-455 uppercase">Preço (R$)</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={editPrice} 
                                onChange={e => setEditPrice(e.target.value)}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red font-mono font-bold text-slate-800"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-455 uppercase">Descrição</label>
                            <textarea 
                              value={editDescription} 
                              onChange={e => setEditDescription(e.target.value)}
                              rows={2}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red text-slate-700"
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button 
                              onClick={() => setEditingItemId(null)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-600"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => saveItem(item.id, true)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-extrabold text-xs text-slate-800">{item.name}</h5>
                              <span className="font-mono text-xs font-bold text-brand-red">R$ {item.price.toFixed(2)}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight mb-3">{item.description}</p>
                          </div>
                          <div className="flex justify-end mt-auto pt-2 border-t border-slate-100/50">
                            <button 
                              onClick={() => startEditing(item)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-655"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 5: TAXAS DE ENTREGA */}
            <div className="space-y-3 mt-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxas de Entrega por Bairro</h4>
              <p className="text-[10.5px] text-slate-500 -mt-1">Gerencie os bairros atendidos e suas respectivas taxas de entrega.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deliveryFees.map((item) => {
                  const isEditing = editingDeliveryFeeId === item.id;
                  return (
                    <div key={item.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left relative flex flex-col justify-between">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-455 uppercase">Nome do Bairro</label>
                            <input 
                              type="text" 
                              value={editDeliveryFeeName} 
                              onChange={e => setEditDeliveryFeeName(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-455 uppercase">Taxa de Entrega (R$)</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              value={editDeliveryFeeAmount} 
                              onChange={e => setEditDeliveryFeeAmount(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-red font-mono font-bold text-slate-800"
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button 
                              onClick={() => setEditingDeliveryFeeId(null)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-600"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => saveDeliveryFee(item.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-extrabold text-xs text-slate-800">{item.name}</h5>
                              <span className="font-mono text-xs font-bold text-brand-red">
                                {item.fee === 0 ? 'Grátis' : `R$ ${item.fee.toFixed(2)}`}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {item.id === 'outros' 
                                ? 'Taxa padrão aplicada para bairros não listados.' 
                                : 'Taxa aplicada para este bairro específico.'}
                            </p>
                          </div>
                          <div className="flex justify-end mt-auto pt-2 border-t border-slate-100/50">
                            <button 
                              onClick={() => startEditingDeliveryFee(item)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer text-slate-655"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: ESTATÍSTICAS */}
        {activeSubTab === 'estatisticas' && (
          <div className="space-y-5 text-left">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <TrendingUp className="w-4 h-4 text-brand-red" />
              Preferência de Clientes e Fluxos
            </h3>

            {orders.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400">Nenhum dado disponível ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Hotdog protein selection */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>🌭 Escolha da Proteína</span>
                    <span className="font-mono">
                      {boiCount}x Boi / {frangoCount}x Frango / {calabresaCount}x Calabresa
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-brand-red h-full" 
                      style={{ width: `${totalDogs > 0 ? (boiCount / totalDogs) * 100 : 0}%` }}
                      title={`Boi: ${totalDogs > 0 ? Math.round((boiCount/totalDogs)*100) : 0}%`}
                    />
                    <div 
                      className="bg-brand-amber h-full" 
                      style={{ width: `${totalDogs > 0 ? (frangoCount / totalDogs) * 100 : 0}%` }}
                      title={`Frango: ${totalDogs > 0 ? Math.round((frangoCount/totalDogs)*100) : 0}%`}
                    />
                    <div 
                      className="bg-orange-600 h-full" 
                      style={{ width: `${totalDogs > 0 ? (calabresaCount / totalDogs) * 100 : 0}%` }}
                      title={`Calabresa: ${totalDogs > 0 ? Math.round((calabresaCount/totalDogs)*100) : 0}%`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1.5 text-[9px] text-slate-400 font-bold uppercase">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-brand-red rounded-full" /> Salsicha de Boi ({totalDogs > 0 ? Math.round((boiCount/totalDogs)*100) : 0}%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-brand-amber rounded-full" /> Frango Desfiado ({totalDogs > 0 ? Math.round((frangoCount/totalDogs)*100) : 0}%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-600 rounded-full" /> Calabresa ({totalDogs > 0 ? Math.round((calabresaCount/totalDogs)*100) : 0}%)</span>
                  </div>
                </div>

                {/* 2. Order type selection */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>🛵 Tipo de Fluxo (Entrega vs Retirada)</span>
                    <span className="font-mono">{deliveryCount}x Entrega / {pickupCount}x Retirada</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-orange-400 h-full" 
                      style={{ width: `${totalOrdersCount > 0 ? (deliveryCount / totalOrdersCount) * 100 : 0}%` }}
                    />
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${totalOrdersCount > 0 ? (pickupCount / totalOrdersCount) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-1 text-[9px] text-slate-400 font-bold uppercase">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full" /> Entrega em Casa</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Retirada Local</span>
                  </div>
                </div>

                {/* 3. Payment Methods */}
                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-2">💳 Métodos de Pagamento Utilizados</span>
                  <div className="space-y-2">
                    {[
                      { label: 'Pix ⚡', val: pixCount, color: 'bg-cyan-500' },
                      { label: 'Cartão de Crédito 💳', val: creditCount, color: 'bg-indigo-500' },
                      { label: 'Cartão de Débito 💳', val: debitCount, color: 'bg-blue-500' },
                      { label: 'Dinheiro 💵', val: cashCount, color: 'bg-emerald-500' }
                    ].map((m, idx) => {
                      const percentage = totalOrdersCount > 0 ? (m.val / totalOrdersCount) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between text-[11px] text-slate-550 font-bold">
                            <span>{m.label}</span>
                            <span className="font-mono">{m.val} ped ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`${m.color} h-full`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: CONFIGURAÇÕES */}
        {activeSubTab === 'config' && (
          <div className="space-y-5 text-left">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Settings className="w-4 h-4 text-slate-650" />
              Configuração do Sistema
            </h3>

            {/* Seção de Gerenciamento de Estoque */}
            <div className="bg-white border border-slate-150 rounded-3xl p-4 md:p-5 shadow-xs space-y-5">
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-tight flex items-center gap-1.5">
                  <span>📦 Gerenciar Disponibilidade de Itens</span>
                </h4>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-tight">Desative itens esgotados. Eles serão imediatamente bloqueados para seleção no cardápio do cliente.</p>
              </div>

              <div className="space-y-4">
                {/* 1. Proteínas */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Proteínas (Passo 1)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'boi', label: 'Salsicha de Boi' },
                      { key: 'frango', label: 'Frango Desfiado' },
                      { key: 'calabresa', label: 'Calabresa Defumada' }
                    ].map((item) => {
                      const isAvailable = !disabledItems.includes(item.key);
                      return (
                        <div key={item.key} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-xs font-bold text-slate-750">{item.label}</span>
                          <button
                            type="button"
                            onClick={() => onToggleDisabledItem(item.key)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                              isAvailable ? 'bg-brand-red' : 'bg-slate-350'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                                isAvailable ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Ingredientes Básicos */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ingredientes Básicos (Passo 2)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { key: 'pao', label: 'Pão' },
                      { key: 'salsicha', label: 'Salsicha' },
                      { key: 'vinagrete', label: 'Vinagrete' },
                      { key: 'cenoura', label: 'Cenoura' },
                      { key: 'milhoErvilha', label: 'Milho & Ervilha' },
                      { key: 'batataPalha', label: 'Batata Palha' }
                    ].map((item) => {
                      const isAvailable = !disabledItems.includes(item.key);
                      return (
                        <div key={item.key} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-[11px] font-bold text-slate-700 truncate mr-1" title={item.label}>{item.label}</span>
                          <button
                            type="button"
                            onClick={() => onToggleDisabledItem(item.key)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
                              isAvailable ? 'bg-brand-red' : 'bg-slate-350'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                                isAvailable ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Bebidas */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Bebidas (Passo 3)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'coca_lata', label: 'Coca-Cola' },
                      { key: 'guarana_lata', label: 'Guaraná' },
                      { key: 'fanta_lata', label: 'Fanta Laranja' },
                      { key: 'suco_laranja', label: 'Suco Laranja' },
                      { key: 'agua', label: 'Água Mineral' }
                    ].map((item) => {
                      const isAvailable = !disabledItems.includes(item.key);
                      return (
                        <div key={item.key} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-[11px] font-bold text-slate-700 truncate mr-1" title={item.label}>{item.label}</span>
                          <button
                            type="button"
                            onClick={() => onToggleDisabledItem(item.key)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
                              isAvailable ? 'bg-brand-red' : 'bg-slate-350'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                                isAvailable ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de Configuração da Chave Pix do Estabelecimento */}
            <div className="bg-white border border-slate-150 rounded-3xl p-4 md:p-5 shadow-xs space-y-4">
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-tight flex items-center gap-1.5">
                  <span>⚡ Chave Pix para Recebimento</span>
                </h4>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-tight">
                  Cadastre sua chave Pix para receber os pagamentos. Se cadastrada, o cliente verá o QR Code e o Copia e Cola para transferir direto para sua conta (sem necessidade de taxas ou do Mercado Pago).
                </p>
              </div>

              <form onSubmit={handleSavePixConfig} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Chave Pix (Celular, CPF/CNPJ, E-mail ou Aleatória)</label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder=""
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-brand-red text-slate-800 font-bold"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Nome Completo do Titular</label>
                    <input
                      type="text"
                      value={pixName}
                      onChange={(e) => setPixName(e.target.value)}
                      placeholder=""
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-brand-red text-slate-800 font-bold"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Cidade do Beneficiário</label>
                    <input
                      type="text"
                      value={pixCity}
                      onChange={(e) => setPixCity(e.target.value)}
                      placeholder=""
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-brand-red text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingPix}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm text-white ${
                      isSavingPix
                        ? 'bg-slate-350 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                    }`}
                  >
                    {isSavingPix ? 'Salvando...' : 'Salvar Chave Pix'}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-700 block">Status da Aplicação</strong>
                  <span className="text-slate-500">Banco de dados local (localStorage) ativo e em perfeito funcionamento.</span>
                </div>
              </div>

              <div className="flex items-start gap-2 border-t border-slate-200/50 pt-2.5">
                <Smartphone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-700 block">Número do WhatsApp Destino</strong>
                  <span className="text-slate-500 font-mono">Suporte ao número configurado nativamente no app.</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl text-[10.5px] leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Dica:</strong> Este painel é exclusivo para visualização interna do administrador do estabelecimento. Os dados são persistidos no navegador local para auditoria e controle de vendas diário.
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}