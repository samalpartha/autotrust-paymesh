'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';
type Language = 'en' | 'es';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Header
    'nav.demo': '🎬 Demo',
    'nav.escrow': '🔒 Escrow',
    'nav.aiAgents': '🤖 AI Agents',
    'nav.meshMind': '🧠 MeshMind',
    'nav.advanced': '🚀 Advanced',
    'nav.backToHome': '← PayMesh Home',
    'header.title': 'PayMesh Operations Console',
    'header.subtitle': 'AutoTrust AI-powered escrow for AI Agents',
    'header.gasPrice': 'Gas Price',
    
    // Demo Tab
    'demo.title': 'Interactive Demo',
    'demo.subtitle': 'See AI-powered escrow decisions in action — no wallet required',
    'demo.loadEscrow': '1️⃣ Load Sample Escrow',
    'demo.runAI': '2️⃣ Run AI Agents',
    'demo.askMeshMind': '3️⃣ Ask MeshMind',
    'demo.reset': '🔄 Reset Demo',
    'demo.backendConnected': 'Backend: ✓ Connected',
    'demo.aiConnected': 'AI: ✓ Connected',
    'demo.step1': 'Load Escrow',
    'demo.step1Desc': 'Fetch sample escrow data',
    'demo.step2': 'AI Analyzes',
    'demo.step2Desc': 'Multi-agent evaluation',
    'demo.step3': 'Decision',
    'demo.step3Desc': 'Recommendation + confidence',
    'demo.step4': 'MeshMind',
    'demo.step4Desc': 'Ask anything',
    'demo.activityLog': 'Activity Log',
    'demo.waiting': 'Waiting for demo actions...',
    'demo.sampleEscrow': 'Sample Escrow',
    'demo.aiDecision': 'AI Agent Decision',
    'demo.aiPowered': 'AI Powered',
    'demo.ruleBased': 'Rule-based',
    'demo.riskFlags': 'Risk Flags',
    'demo.noRisks': 'No risks identified',
    'demo.copilotResponse': 'MeshMind Response',
    'demo.features': 'Platform Features',
    
    // Escrow Tab
    'escrow.create': 'Create Escrow',
    'escrow.approve': 'Approve',
    'escrow.release': 'Release Funds',
    'escrow.refund': 'Refund',
    'escrow.amount': 'Amount',
    'escrow.payee': 'Payee Address',
    'escrow.arbiter': 'Arbiter Address',
    'escrow.deadline': 'Deadline (minutes)',
    'escrow.key': 'Escrow Key',
    'escrow.createNew': 'Create New Escrow',
    'escrow.details': 'Escrow Details',
    'escrow.actions': 'Escrow Actions',
    'escrow.opsLog': 'Ops Log',
    'escrow.noEvents': 'No events yet',
    'escrow.payer': 'Payer',
    'escrow.status': 'Status',
    'escrow.deadlineLabel': 'Deadline',
    'escrow.viewId': 'View Escrow ID',
    'escrow.copyId': 'Copy ID',
    'escrow.txHash': 'Last Transaction',
    
    // Status
    'status.none': 'None',
    'status.funded': 'Funded',
    'status.released': 'Released',
    'status.refunded': 'Refunded',
    'status.pending': 'Pending',
    
    // AI Agents
    'ai.title': 'AI Agent Decisions',
    'ai.recommendation': 'Recommendation',
    'ai.confidence': 'Confidence',
    'ai.rationale': 'Rationale',
    'ai.getRecommendation': 'Get AI Recommendation',
    'ai.escrowIdPlaceholder': 'Enter Escrow ID (0x...)',
    'ai.noDecisions': 'No AI decisions yet',
    'ai.recentDecisions': 'Recent Decisions',
    'ai.provider': 'Provider',
    'ai.release': 'RELEASE',
    'ai.refund': 'REFUND',
    'ai.hold': 'HOLD',
    
    // MeshMind
    'mesh.title': 'MeshMind Assistant',
    'mesh.subtitle': 'Your intelligent knowledge companion',
    'mesh.placeholder': 'Ask anything about escrows, policies, or platform features...',
    'mesh.ask': 'Ask',
    'mesh.suggestions': 'Suggested Questions',
    'mesh.history': 'Conversation History',
    'mesh.noHistory': 'Start a conversation',
    'mesh.capabilities': 'Capabilities',
    'mesh.escrowOps': 'Escrow Operations',
    'mesh.escrowOpsDesc': 'Create, release, refund flows',
    'mesh.policies': 'Policies & Rules',
    'mesh.policiesDesc': 'Release, refund, dispute policies',
    'mesh.aiSystem': 'AI Agent System',
    'mesh.aiSystemDesc': 'Autonomous decision making',
    
    // Common
    'common.loading': 'Loading...',
    'common.analyzing': 'Analyzing...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.connectWallet': 'Connect Wallet',
    'common.disconnect': 'Disconnect',
    'common.balance': 'Balance',
    'common.network': 'Network',
    'common.copied': 'Copied!',
    'common.you': 'You',
    'common.wallet': 'Wallet',
    
    // Wallet
    'wallet.connectDesc': 'Connect your wallet to interact with MNEE escrows on {network}.',
    
    // Tooltips
    'tooltip.demo': 'Try AI features without wallet (Press D)',
    'tooltip.escrow': 'Create and manage escrows (Press E)',
    'tooltip.aiAgents': 'Get AI recommendations (Press A)',
    'tooltip.meshMind': 'Ask questions in plain English (Press M)',
    'tooltip.advanced': 'Negotiation, Reputation, Arbitration (Press X)',
    'tooltip.gasPrice': 'Real-time gas prices',
    'tooltip.network': 'Connected network',
    'tooltip.wallet': 'Connect or manage wallet',
    'tooltip.lightMode': 'Switch to Light Mode',
    'tooltip.darkMode': 'Switch to Dark Mode',
    'tooltip.langEs': 'Cambiar a Español',
    'tooltip.langEn': 'Switch to English',
    
    // Home Page
    'home.tagline': 'AI-Powered Escrow Settlement',
    'home.title1': 'PayMesh AutoTrust',
    'home.title2': 'for AI Agents',
    'home.subtitle': 'Trustless escrow settlement powered by multi-agent AI decisions. Natural language copilot with programmable MNEE flows.',
    'home.openConsole': 'Open Console →',
    'home.viewCode': 'View Code',
    'home.feature1.title': 'Multi-Agent AI',
    'home.feature1.desc': 'Compliance, operations, and arbiter agents analyze every escrow',
    'home.feature2.title': 'RAG Copilot',
    'home.feature2.desc': 'Ask questions in plain English, get grounded answers',
    'home.feature3.title': 'Instant Settlement',
    'home.feature3.desc': 'On-chain escrow with deterministic release and refund',
    'home.howItWorks': 'How It Works',
    'home.step1.title': 'Fund Escrow',
    'home.step1.desc': 'Lock MNEE in smart contract',
    'home.step2.title': 'AI Analyzes',
    'home.step2.desc': 'Multi-agent recommendation',
    'home.step3.title': 'Execute',
    'home.step3.desc': 'Release or refund on-chain',
    'home.footer': 'Built for MNEE Hackathon • AI Agent Payments Track',
  },
  es: {
    // Navigation & Header
    'nav.demo': '🎬 Demo',
    'nav.escrow': '🔒 Custodia',
    'nav.aiAgents': '🤖 Agentes IA',
    'nav.meshMind': '🧠 MeshMind',
    'nav.advanced': '🚀 Avanzado',
    'nav.backToHome': '← Inicio PayMesh',
    'header.title': 'Consola de Operaciones PayMesh',
    'header.subtitle': 'AutoTrust - custodia impulsada por IA para Agentes IA',
    'header.gasPrice': 'Precio del Gas',
    
    // Demo Tab
    'demo.title': 'Demo Interactiva',
    'demo.subtitle': 'Ve las decisiones de custodia impulsadas por IA en acción — sin billetera',
    'demo.loadEscrow': '1️⃣ Cargar Custodia',
    'demo.runAI': '2️⃣ Ejecutar Agentes IA',
    'demo.askMeshMind': '3️⃣ Preguntar a MeshMind',
    'demo.reset': '🔄 Reiniciar Demo',
    'demo.backendConnected': 'Backend: ✓ Conectado',
    'demo.aiConnected': 'IA: ✓ Conectada',
    'demo.step1': 'Cargar Custodia',
    'demo.step1Desc': 'Obtener datos de ejemplo',
    'demo.step2': 'IA Analiza',
    'demo.step2Desc': 'Evaluación multi-agente',
    'demo.step3': 'Decisión',
    'demo.step3Desc': 'Recomendación + confianza',
    'demo.step4': 'MeshMind',
    'demo.step4Desc': 'Pregunta lo que sea',
    'demo.activityLog': 'Registro de Actividad',
    'demo.waiting': 'Esperando acciones de demo...',
    'demo.sampleEscrow': 'Custodia de Ejemplo',
    'demo.aiDecision': 'Decisión del Agente IA',
    'demo.aiPowered': 'Impulsado por IA',
    'demo.ruleBased': 'Basado en reglas',
    'demo.riskFlags': 'Indicadores de Riesgo',
    'demo.noRisks': 'No se identificaron riesgos',
    'demo.copilotResponse': 'Respuesta de MeshMind',
    'demo.features': 'Características de la Plataforma',
    
    // Escrow Tab
    'escrow.create': 'Crear Custodia',
    'escrow.approve': 'Aprobar',
    'escrow.release': 'Liberar Fondos',
    'escrow.refund': 'Reembolsar',
    'escrow.amount': 'Cantidad',
    'escrow.payee': 'Dirección del Beneficiario',
    'escrow.arbiter': 'Dirección del Árbitro',
    'escrow.deadline': 'Plazo (minutos)',
    'escrow.key': 'Clave de Custodia',
    'escrow.createNew': 'Crear Nueva Custodia',
    'escrow.details': 'Detalles de Custodia',
    'escrow.actions': 'Acciones de Custodia',
    'escrow.opsLog': 'Registro de Operaciones',
    'escrow.noEvents': 'Sin eventos aún',
    'escrow.payer': 'Pagador',
    'escrow.status': 'Estado',
    'escrow.deadlineLabel': 'Fecha límite',
    'escrow.viewId': 'Ver ID de Custodia',
    'escrow.copyId': 'Copiar ID',
    'escrow.txHash': 'Última Transacción',
    
    // Status
    'status.none': 'Ninguno',
    'status.funded': 'Financiado',
    'status.released': 'Liberado',
    'status.refunded': 'Reembolsado',
    'status.pending': 'Pendiente',
    
    // AI Agents
    'ai.title': 'Decisiones de Agentes IA',
    'ai.recommendation': 'Recomendación',
    'ai.confidence': 'Confianza',
    'ai.rationale': 'Justificación',
    'ai.getRecommendation': 'Obtener Recomendación IA',
    'ai.escrowIdPlaceholder': 'Ingresa ID de Custodia (0x...)',
    'ai.noDecisions': 'Sin decisiones de IA aún',
    'ai.recentDecisions': 'Decisiones Recientes',
    'ai.provider': 'Proveedor',
    'ai.release': 'LIBERAR',
    'ai.refund': 'REEMBOLSAR',
    'ai.hold': 'RETENER',
    
    // MeshMind
    'mesh.title': 'Asistente MeshMind',
    'mesh.subtitle': 'Tu compañero de conocimiento inteligente',
    'mesh.placeholder': 'Pregunta sobre custodias, políticas o funciones de la plataforma...',
    'mesh.ask': 'Preguntar',
    'mesh.suggestions': 'Preguntas Sugeridas',
    'mesh.history': 'Historial de Conversación',
    'mesh.noHistory': 'Inicia una conversación',
    'mesh.capabilities': 'Capacidades',
    'mesh.escrowOps': 'Operaciones de Custodia',
    'mesh.escrowOpsDesc': 'Flujos de crear, liberar, reembolsar',
    'mesh.policies': 'Políticas y Reglas',
    'mesh.policiesDesc': 'Políticas de liberación, reembolso, disputa',
    'mesh.aiSystem': 'Sistema de Agentes IA',
    'mesh.aiSystemDesc': 'Toma de decisiones autónoma',
    
    // Common
    'common.loading': 'Cargando...',
    'common.analyzing': 'Analizando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.connectWallet': 'Conectar Billetera',
    'common.disconnect': 'Desconectar',
    'common.balance': 'Saldo',
    'common.network': 'Red',
    'common.copied': '¡Copiado!',
    'common.you': 'Tú',
    'common.wallet': 'Billetera',
    
    // Wallet
    'wallet.connectDesc': 'Conecta tu billetera para interactuar con custodias MNEE en {network}.',
    
    // Tooltips
    'tooltip.demo': 'Prueba funciones IA sin billetera (Tecla D)',
    'tooltip.escrow': 'Crear y gestionar custodias (Tecla E)',
    'tooltip.aiAgents': 'Obtener recomendaciones IA (Tecla A)',
    'tooltip.meshMind': 'Haz preguntas en español (Tecla M)',
    'tooltip.advanced': 'Negociación, Reputación, Arbitraje (Tecla X)',
    'tooltip.gasPrice': 'Precios de gas en tiempo real',
    'tooltip.network': 'Red conectada',
    'tooltip.wallet': 'Conectar o gestionar billetera',
    'tooltip.lightMode': 'Cambiar a Modo Claro',
    'tooltip.darkMode': 'Cambiar a Modo Oscuro',
    'tooltip.langEs': 'Cambiar a Español',
    'tooltip.langEn': 'Switch to English',
    
    // Home Page
    'home.tagline': 'Custodia Impulsada por IA',
    'home.title1': 'PayMesh AutoTrust',
    'home.title2': 'para Agentes IA',
    'home.subtitle': 'Custodia sin confianza impulsada por decisiones de IA multi-agente. Copiloto en lenguaje natural con flujos MNEE programables.',
    'home.openConsole': 'Abrir Consola →',
    'home.viewCode': 'Ver Código',
    'home.feature1.title': 'IA Multi-Agente',
    'home.feature1.desc': 'Agentes de cumplimiento, operaciones y arbitraje analizan cada custodia',
    'home.feature2.title': 'Copiloto RAG',
    'home.feature2.desc': 'Haz preguntas en español, obtén respuestas fundamentadas',
    'home.feature3.title': 'Liquidación Instantánea',
    'home.feature3.desc': 'Custodia en cadena con liberación y reembolso determinístico',
    'home.howItWorks': 'Cómo Funciona',
    'home.step1.title': 'Financiar Custodia',
    'home.step1.desc': 'Bloquear MNEE en contrato inteligente',
    'home.step2.title': 'IA Analiza',
    'home.step2.desc': 'Recomendación multi-agente',
    'home.step3.title': 'Ejecutar',
    'home.step3.desc': 'Liberar o reembolsar en cadena',
    'home.footer': 'Construido para MNEE Hackathon • Vía de Pagos de Agentes IA',
  }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [language, setLanguage] = useState<Language>('en');

  // Load from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const savedLang = localStorage.getItem('language') as Language | null;
    if (savedTheme) setTheme(savedTheme);
    if (savedLang) setLanguage(savedLang);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      isDark: theme === 'dark',
      language,
      setLanguage,
      t,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
