'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Zap, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  MessageSquare,
  Smartphone,
  Cpu,
  Loader2,
  Sparkles
} from 'lucide-react';
import LandingHeader from '@/components/layout/LandingHeader';
import PricingCard from '@/components/shared/PricingCard';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Mapeamento de ícones por chave de plano (igual ao SubscriptionClient)
const planIcons: Record<string, React.ReactNode> = {
  freemium: <Zap className="h-5 w-5 text-amber-500" />,
  starter: <Sparkles className="h-5 w-5 text-blue-500" />,
  pro: <Crown className="h-5 w-5 text-[#FFE600]" />,
};

import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';
import LandingFooter from '@/components/layout/LandingFooter';
import { getPlatformBranding } from '@/app/_actions/tenant';


export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = React.useState<string>('Starter');
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);
  const [plans, setPlans] = React.useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = React.useState(true);
  const [branding, setBranding] = React.useState<any>(null);

  React.useEffect(() => {
    async function loadBranding() {
      const data = await getPlatformBranding();
      setBranding(data);
    }
    loadBranding();
  }, []);


  React.useEffect(() => {
    async function fetchPlans() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('plan_limits')
        .select('*')
        .order('display_order');

      if (error) {
        console.error('Erro ao carregar planos:', error);
      } else if (data) {
        setPlans(data);
        // Tenta encontrar o plano Starter para deixar selecionado por padrão
        const starterPlan = data.find((p: any) => p.plan_type === 'starter');
        if (starterPlan) setSelectedPlan(starterPlan.display_name || 'Starter');
      }
      setIsLoadingPlans(false);
    }
    fetchPlans();
  }, []);

  const handleCheckout = async (planId: string) => {
    try {
      setLoadingPlan(planId);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: planId.toLowerCase() }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Erro ao gerar checkout:', data.error);
        alert(`Erro no checkout: ${data.error || 'Ocorreu um erro inesperado. Tente novamente.'}`);
      }
    } catch (error) {
      console.error('Erro no checkout:', error);
      alert('Erro de conexão ou erro interno ao processar o checkout.');
    } finally {
      setLoadingPlan(null);
    }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D0D] text-white">
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="container mx-auto px-6 max-w-[1200px] relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#FFE600]/10 text-[#FFE600] text-xs font-bold uppercase tracking-wider mb-6 border border-[#FFE600]/20">
              O CRM que pensa como você
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              Profissionalize sua Imobiliária com <span className="text-white underline decoration-[#FFE600] decoration-4 underline-offset-8">IA e Automação</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-medium mb-10 leading-relaxed">
              O CRM LAX não é apenas um software de gestão. É o seu assistente de vendas inteligente que automatiza o trabalho pesado para você focar no fechamento.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="#planos" 
                className="w-full sm:w-auto bg-[#FFE600] text-[#404F4F] px-8 py-4 rounded-lg text-lg font-bold hover:bg-[#F2DB00] transition-all transform active:scale-95 shadow-lg shadow-[#FFE600]/10 flex items-center justify-center gap-2"
              >
                Experimentar Grátis <ArrowRight className="w-5 h-5" />
              </a>
              <a 
                href="#funcoes" 
                className="w-full sm:w-auto bg-white/5 text-white border border-white/10 px-8 py-4 rounded-lg text-lg font-bold hover:bg-white/10 transition-all flex items-center justify-center"
              >
                Ver Funções
              </a>
            </div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-[#FFE600]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#404F4F]/10 rounded-full blur-[100px]" />
      </section>

      {/* Features Section */}
      <section id="funcoes" className="pt-20 pb-24 bg-[#0F1212]">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Desenvolvido para Resultados</h2>
            <p className="text-gray-400 font-medium max-w-2xl mx-auto">Tudo o que corretores e imobiliárias precisam para escalar sem complexidade.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <Cpu className="w-8 h-8 text-[#FFE600]" />,
                title: "Inteligência Artificial",
                desc: "Análise de leads e geração de copys para anúncios em segundos com Gemini 2.0 Flash."
              },
              {
                icon: <Zap className="w-8 h-8 text-[#FFE600]" />,
                title: "Automações Reais",
                desc: "Ingestão automática de leads de qualquer fonte (Facebook, Google, Site) via n8n."
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-[#FFE600]" />,
                title: "Gestão Visual",
                desc: "Kanban intuitivo e limpo para você nunca mais perder o controle da sua jornada de vendas."
              },
              {
                icon: <MessageSquare className="w-8 h-8 text-[#FFE600]" />,
                title: "WhatsApp Integrado",
                desc: "Interações registradas e histórico completo do cliente em um único lugar."
              },
              {
                icon: <Smartphone className="w-8 h-8 text-[#FFE600]" />,
                title: "100% Mobile",
                desc: "Acesse todo o seu estoque e CRM de qualquer lugar, direto pelo seu celular como um PWA."
              },
              {
                icon: <ShieldCheck className="w-8 h-8 text-[#FFE600]" />,
                title: "Segurança de Dados",
                desc: "Sua base de dados protegida com criptografia e isolamento por inquilino (RLS)."
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-[#FFE600]/30 transition-all hover:shadow-2xl group"
              >
                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5 inline-block group-hover:bg-[#FFE600] group-hover:text-[#404F4F] transition-all duration-300">
                  {React.cloneElement(feature.icon as React.ReactElement<any>, { 
                    className: "w-8 h-8 group-hover:text-[#404F4F]" 
                  })}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="pt-20 pb-24 bg-[#0A0D0D]">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Escolha o seu Plano</h2>
            <p className="text-gray-400 font-medium max-w-2xl mx-auto">Preços transparentes que acompanham o crescimento do seu negócio.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isLoadingPlans ? (
              // Skeleton loading ou apenas um loader simples
              <div className="col-span-1 md:col-span-3 flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#FFE600]" />
              </div>
            ) : (
              plans.map((plan) => (
                <PricingCard 
                  key={plan.plan_type}
                  title={plan.display_name || plan.plan_type}
                  price={plan.price_text || 'R$ 0'}
                  isSelected={selectedPlan === (plan.display_name || plan.plan_type)}
                  isPopular={plan.is_highlighted}
                  onClick={() => setSelectedPlan(plan.display_name || plan.plan_type)}
                  onAction={() => handleCheckout(plan.plan_type)}
                  loading={loadingPlan === plan.plan_type}
                  description={plan.description_text || ''}
                  features={plan.features_list || []}
                  aiFeatures={plan.ai_features_list || []}
                  icon={planIcons[plan.plan_type as keyof typeof planIcons]}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Guarantees Section */}
      <section id="garantias" className="pt-20 pb-24 bg-[#0F1212]">
        <div className="container mx-auto px-6 max-w-[1000px]">
          <div className="bg-[#1A2020] border border-white/5 rounded-[32px] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Segurança e Compromisso CRM LAX</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-[#FFE600] shrink-0 mt-1" />
                    <p className="text-gray-300 font-medium"><strong>Propriedade dos Dados:</strong> Seus contatos são seus. Exportação simplificada a qualquer momento.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-[#FFE600] shrink-0 mt-1" />
                    <p className="text-gray-300 font-medium"><strong>Garantia de Satisfação:</strong> 7 dias de garantia incondicional ou seu dinheiro de volta.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-[#FFE600] shrink-0 mt-1" />
                    <p className="text-gray-300 font-medium"><strong>Suporte Premium:</strong> Time técnico brasileiro pronto para ajudar você.</p>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative">
                  <div className="w-32 h-32 md:w-48 md:h-48 border-4 border-[#FFE600]/30 rounded-full flex items-center justify-center animate-pulse overflow-hidden bg-[#1A2020]">
                    <Image 
                      src="/logo-icon.png" 
                      alt="Logo Icon" 
                      width={120} 
                      height={120} 
                      className="w-2/3 h-2/3 object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFE600]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>
        </div>
      </section>

      <LandingFooter branding={branding} />

    </div>
  );
}
