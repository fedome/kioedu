import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  ShieldCheck,
  BarChart3,
  Smartphone,
  CheckCircle2,
  Store,
  CreditCard,
  Wifi,
  Bell,
  MessageCircle,
  Users,
  Receipt,
  Lock,
  Headphones,
  ChevronRight,
  AlertTriangle,
  Send,
  Mail,
  Building2,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import React from 'react';

const WHATSAPP_URL = 'https://wa.me/5491162558127?text=Hola%2C%20quiero%20info%20sobre%20Kio%20para%20mi%20colegio';

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

/* ─── Scroll-Animated Section Wrapper (Intersection Observer) ─── */
function AnimatedSection({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function App() {
  return (
    <div className="min-h-screen font-sans selection:bg-brand-200 bg-slate-50 overflow-hidden">

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[5rem] sm:h-[6rem] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <img src="/Logo/LogoKioEduSinFondo.svg" alt="KioEdu Logo" className="h-16 sm:h-20 w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Características</a>
            <a href="#how" className="hover:text-slate-900 transition-colors">Cómo Funciona</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Precios</a>
          </div>

          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="bg-brand-600 hover:bg-brand-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.97] flex items-center gap-2 no-underline">
            <MessageCircle className="w-4 h-4" /> Contactanos
          </a>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-20 md:pt-44 md:pb-28 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute -top-40 right-0 w-[700px] h-[700px] bg-brand-400/15 rounded-full blur-[120px]" />
          <div className="absolute top-40 -left-40 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center lg:text-left z-10">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 font-semibold text-xs uppercase tracking-wider mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>
              El sistema que moderniza el kiosco escolar
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black text-slate-900 tracking-tight leading-[1.08] mb-6">
              La forma más simple de <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-blue-500">digitalizar el kiosco</span> escolar.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base sm:text-lg md:text-xl text-slate-500 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Kioedu incorpora pagos con tarjeta RFID para alumnos, app para padres y control de consumos, manteniendo medios de pago tradicionales como efectivo y Mercado Pago.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <a href="#contacto" className="w-full sm:w-auto px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 active:scale-[0.97] flex items-center justify-center gap-2 text-[15px] no-underline">
                Solicitar demo
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all border border-slate-200 hover:border-slate-300 active:scale-[0.97] flex items-center justify-center gap-2 text-[15px] no-underline">
                <MessageCircle className="w-4 h-4" /> Hablar por WhatsApp
              </a>
            </motion.div>

            {/* Trust Signals */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Datos encriptados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Normativa ARCA vigente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5" />
                <span>Soporte incluido</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="relative h-[380px] sm:h-[480px] lg:h-[560px] flex items-center justify-center"
          >
            <div className="relative w-full max-w-lg aspect-square">
              {/* POS Window */}
              <div className="absolute top-0 right-0 w-[78%] h-[68%] bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200/60 z-10 overflow-hidden">
                <div className="h-8 bg-slate-50 border-b border-slate-100 flex items-center px-3 gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  <div className="flex-1 flex justify-center">
                    <div className="text-[9px] text-slate-400 font-medium">pos.kio.com.ar</div>
                  </div>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="flex gap-2">
                    <div className="px-2 py-0.5 bg-brand-100 rounded text-[8px] font-bold text-brand-700">Snacks</div>
                    <div className="px-2 py-0.5 bg-slate-100 rounded text-[8px] text-slate-400">Bebidas</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="aspect-square bg-brand-50 rounded-lg border border-brand-200" />
                    <div className="aspect-square bg-slate-50 rounded-lg border border-slate-100" />
                    <div className="aspect-square bg-slate-50 rounded-lg border border-slate-100" />
                  </div>
                  <div className="bg-slate-50 rounded-lg border border-slate-100 p-2 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="h-2 w-16 bg-slate-200 rounded" />
                      <div className="h-1.5 w-10 bg-slate-100 rounded" />
                    </div>
                    <div className="h-6 w-14 bg-brand-500 rounded-md text-[7px] text-white font-bold flex items-center justify-center">Cobrar</div>
                  </div>
                </div>
              </div>

              {/* Mobile App (Parents App) */}
              <div className="absolute bottom-0 left-0 w-[48%] h-[82%] bg-slate-50 rounded-[1.8rem] shadow-2xl shadow-slate-900/15 border-[5px] border-white z-20 flex flex-col overflow-hidden">
                <div className="h-5 flex justify-center pt-1.5 bg-white">
                  <div className="w-10 h-1 rounded-full bg-slate-200" />
                </div>
                <div className="flex-1 p-2.5 space-y-2.5 bg-slate-50">
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-[9px] font-bold text-slate-900">App Padres</span>
                    <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center">
                      <Bell className="w-2.5 h-2.5 text-slate-500" />
                    </div>
                  </div>
                  <div className="bg-brand-600 rounded-xl p-2.5 relative overflow-hidden shadow-lg shadow-brand-500/20 shadow-[inset_0_1px_rgba(255,255,255,0.2)]">
                    <div className="absolute top-1.5 right-1.5 opacity-40"><Wifi className="w-2.5 h-2.5 text-white" /></div>
                    <span className="text-[7px] text-brand-100 font-semibold block">Saldo disponible</span>
                    <span className="text-base font-black text-white">$4.250</span>
                    <span className="text-[7px] text-brand-200 block mt-0.5 font-medium">Juanito Pérez · 3° B</span>
                  </div>
                  {/* Push Notification */}
                  <motion.div
                    animate={{ x: [16, 0], opacity: [0, 1] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: 'easeOut', repeatDelay: 4 }}
                    className="bg-white rounded-lg p-2 shadow-sm border border-slate-100/50"
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="w-4 h-4 bg-emerald-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-800 leading-tight">Juanito gastó $1.500</p>
                        <p className="text-[7px] text-slate-400 leading-tight">Sándwich + Jugo · Hace 2 min</p>
                      </div>
                    </div>
                  </motion.div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="h-7 bg-white border border-brand-200 shadow-sm rounded-lg flex items-center justify-center">
                      <span className="text-[7px] font-bold text-brand-600">Recargar</span>
                    </div>
                    <div className="h-7 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center justify-center">
                      <span className="text-[7px] font-bold text-slate-500">Historial</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating RFID Card */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute top-[18%] -left-[4%] sm:-left-[8%] z-30 py-2 px-3 bg-white rounded-xl shadow-lg shadow-slate-900/8 border border-slate-100 flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-700">RFID #4821</p>
                  <p className="text-[7px] text-slate-400">Escaneado</p>
                </div>
              </motion.div>

              {/* Floating Success */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1.5 }}
                className="absolute bottom-[22%] -right-[1%] sm:-right-[4%] z-30 py-2 px-3 bg-white rounded-xl shadow-lg shadow-slate-900/8 border border-slate-100 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-600">Recarga acreditada</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ STATS BAR ═══════════ */}
      <section className="py-6 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <motion.div variants={fadeUp} className="text-center">
              <p className="text-base sm:text-lg font-black text-slate-900">Pagos con RFID</p>
              <p className="text-xs text-slate-400 mt-1">Para alumnos mediante tarjeta</p>
            </motion.div>
            <motion.div variants={fadeUp} className="text-center">
              <p className="text-base sm:text-lg font-black text-slate-900">App para padres</p>
              <p className="text-xs text-slate-400 mt-1">Incluida en todos los planes</p>
            </motion.div>
            <motion.div variants={fadeUp} className="text-center">
              <p className="text-base sm:text-lg font-black text-slate-900">Facturación ARCA</p>
              <p className="text-xs text-slate-400 mt-1">Integración oficial disponible</p>
            </motion.div>
            <motion.div variants={fadeUp} className="text-center">
              <p className="text-base sm:text-lg font-black text-slate-900">Plataforma Web</p>
              <p className="text-xs text-slate-400 mt-1">Soporte y gestión constante</p>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="py-20 sm:py-28 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
            <motion.p variants={fadeUp} className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">Solución Integral</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-[44px] font-black text-slate-900 mb-4 tracking-tight leading-tight">Más control, más orden<br className="hidden md:block" /> y una mejor operación.</motion.h2>
            <motion.p variants={fadeUp} className="text-base sm:text-lg text-slate-500">Todo lo que el kiosco escolar y las familias necesitan para comprar y vender mejor.</motion.p>
          </AnimatedSection>

          <AnimatedSection className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <FeatureCard icon={<CreditCard />} title="Pagos con tarjeta RFID" description="Los alumnos pueden comprar con su tarjeta de forma rápida y controlada, evitando manejar billetes todos los días." />
            <FeatureCard icon={<Smartphone />} title="App para padres incluida" description="Las familias pueden recargar saldo, ver compras y seguir de cerca los consumos directamente desde el celular." />
            <FeatureCard icon={<AlertTriangle className="text-brand-600" />} title="Límites de gasto diarios" description="Los padres pueden definir cuánto puede gastar su hijo por día. Si supera ese monto, el sistema no permite seguir comprando." />
            <FeatureCard icon={<BarChart3 />} title="Control de ventas y caja" description="El kiosco administra fácilmente ventas, caja, historial y reportes de movimientos desde una sola plataforma web." />
            <FeatureCard icon={<Receipt />} title="Facturación ARCA integrada" description="Emisión automática de Ticket Factura C homologados, garantizando una administración contable más profesional." />
            <FeatureCard icon={<Store />} title="Plataforma web simple de usar" description="Accedé al Punto de Venta desde el navegador web que prefieras. No requiere instalar servidores complejos." />
          </AnimatedSection>
        </div>
      </section>


      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how" className="py-20 sm:py-28 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-14 sm:mb-20">
            <motion.p variants={fadeUp} className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">Proceso</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-[44px] font-black tracking-tight leading-tight text-slate-900 mb-4">Cómo funciona KioEdu</motion.h2>
            <motion.p variants={fadeUp} className="text-slate-500 text-base sm:text-lg">Una operatoria clara diseñada para el día a día escolar.</motion.p>
          </AnimatedSection>

          <AnimatedSection className="grid md:grid-cols-3 gap-8 sm:gap-10 relative">
            <div className="hidden md:block absolute top-[45px] left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <StepCard number="1" title="Los padres configuran desde la app" description="Cargan saldo, ven movimientos y definen los límites de gasto o restricciones diarias por alumno." />
            <StepCard number="2" title="El alumno compra con su tarjeta RFID" description="El kiosco registra la venta al instante, y también puede seguir cobrando con efectivo u otros medios tradicionales si lo prefiere." />
            <StepCard number="3" title="Todo queda bajo control" description="El kiosco organiza mejor su operación general, los padres tienen visibilidad continua y el colegio gana trazabilidad." />
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ PARA QUIEN ES KIOEDU ═══════════ */}
      <section className="py-20 sm:py-28 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-14">
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-[40px] font-black text-slate-900 tracking-tight leading-tight mb-2">KioEdu es ideal para...</motion.h2>
          </AnimatedSection>

          <AnimatedSection className="max-w-2xl mx-auto bg-slate-50 border border-slate-100 rounded-2xl p-6 sm:p-10 shadow-sm">
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium leading-relaxed">Kioscos escolares que quieren ordenar ventas y cobros y minimizar fugas.</span>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium leading-relaxed">Colegios que buscan reducir el uso de efectivo en los alumnos dentro del edificio.</span>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium leading-relaxed">Instituciones que quieren blindar más control y transparencia real para las familias.</span>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium leading-relaxed">Operadores que necesitan una gestión seria, integral y más profesional.</span>
              </li>
            </ul>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ LA IMPLEMENTACION ═══════════ */}
      <section className="py-20 sm:py-28 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-14">
            <motion.p variants={fadeUp} className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">Onboarding</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-[40px] font-black text-slate-900 mb-4 tracking-tight leading-tight">Implementación acompañada</motion.h2>
            <motion.p variants={fadeUp} className="text-base sm:text-lg text-slate-500">KioEdu acompaña la puesta en marcha del sistema para que comiences a operar con la mayor confianza.</motion.p>
          </AnimatedSection>

          <AnimatedSection className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <motion.div variants={fadeUp} className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-2">Configuración inicial</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Alta del kiosco o colegio y parametrización básica del menú operativo.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-2">Capacitación inicial</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Entrenamiento operativo sobre cobros, recargas e impresiones oficiales al personal.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-2">Asesoramiento de hardware</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Ayuda especializada para adquirir e instalar los lectores RFID físicos que requieras integrados al software.</p>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection className="max-w-2xl mx-auto mt-10 p-5 bg-brand-50 border border-brand-100 rounded-xl flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-brand-800 leading-relaxed font-medium">
              <strong>Aclaración sobre el equipamiento:</strong> El lector RFID y las tarjetas requeridas son adquiridos por el kiosco o el colegio. KioEdu asiste exhaustivamente en elegir el equipamiento compatible y acompaña sin interrupciones durante la implementación del mismo.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ ECOSISTEMA DEL PRODUCTO ═══════════ */}
      <section className="py-20 sm:py-28 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-14">
            <motion.p variants={fadeUp} className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">Ecosistema del producto</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-[40px] font-black text-slate-900 mb-4 tracking-tight leading-tight">Todo lo que necesitás,<br />en 3 partes integradas</motion.h2>
          </AnimatedSection>

          <AnimatedSection className="grid sm:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
            <motion.div variants={fadeUp} className="p-8 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-600 shadow-sm mb-6">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-xl mb-4">POS para kiosco</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" /> Ventas y caja</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" /> Alumnos y recargas</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" /> Productos</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" /> Reportes</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" /> Facturación ARCA</li>
              </ul>
            </motion.div>

            <motion.div variants={fadeUp} className="p-8 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-xl mb-4">App para padres</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Consulta de saldo</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Historial de compras</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Carga de saldo</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Notificaciones y límites</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Perfil del hijo</li>
              </ul>
            </motion.div>

            <motion.div variants={fadeUp} className="p-8 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm mb-6">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-xl mb-4">Gestión administrativa</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> Usuarios, roles y permisos</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> Colegios y kioscos</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> Suscripciones</li>
                <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> Soporte</li>
              </ul>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ POR QUE DIGITALIZAR ═══════════ */}
      <section className="py-20 sm:py-28 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-14">
            <motion.p variants={fadeUp} className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">Por qué digitalizar el kiosco escolar</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-[44px] font-black text-slate-900 mb-4 tracking-tight leading-tight">Menos desorden,<br />más control</motion.h2>
            <motion.p variants={fadeUp} className="text-base sm:text-lg text-slate-500">Una operación mucho más clara para todos los actores de la comunidad educativa.</motion.p>
          </AnimatedSection>

          <AnimatedSection className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <motion.div variants={fadeUp} className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                <CreditCard className="w-5 h-5" />
              </div>
              <p className="text-lg font-black text-slate-900 mb-1">Menos manejo de efectivo</p>
              <p className="text-sm text-slate-800 font-semibold mb-2">Alumnos y operadores</p>
              <p className="text-xs text-slate-400 leading-relaxed">Una experiencia más ordenada y segura para la compra diaria, limitando la circulación de billetes físicos en el colegio.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <p className="text-lg font-black text-slate-900 mb-1">Más visibilidad</p>
              <p className="text-sm text-slate-800 font-semibold mb-2">Para las familias</p>
              <p className="text-xs text-slate-400 leading-relaxed">Los padres saben exactamente cuánto gastan sus hijos y qué consumen en tiempo real de manera confiable.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 mb-4">
                <Store className="w-5 h-5" />
              </div>
              <p className="text-lg font-black text-slate-900 mb-1">Más orden</p>
              <p className="text-sm text-slate-800 font-semibold mb-2">En ventas y consumos</p>
              <p className="text-xs text-slate-400 leading-relaxed">El kiosco trabaja con mayor control general, mejorando su registro y permitiendo reducir el seguimiento manual.</p>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">Preguntas frecuentes</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-[44px] font-black text-slate-900 mb-4 tracking-tight leading-tight">Resolvé tus dudas</motion.h2>
          </AnimatedSection>

          <AnimatedSection className="space-y-3">
            <FaqItem question="¿Kioedu reemplaza el efectivo por completo?" answer="No. Kioedu reduce drásticamente el uso de efectivo en los alumnos, pero el operador del kiosco puede seguir cobrando con efectivo, Mercado Pago y otros medios de pago habituales desde la misma caja." />
            <FaqItem question="¿Se puede seguir cobrando con efectivo o Mercado Pago?" answer="Sí. Kioedu convive perfectamente con los medios de pago tradicionales y suma de forma nativa la posibilidad de pagar con tarjeta RFID para los alumnos." />
            <FaqItem question="¿La app para padres está incluida?" answer="Sí. La app para padres está completamente incluida en ambos planes desde el primer día." />
            <FaqItem question="¿Qué pueden hacer los padres desde la app?" answer="Pueden recargar saldo (vía MercadoPago), ver todo el historial de compras detallado, recibir notificaciones y configurar límites de gasto diarios o restricciones por alumno." />
            <FaqItem question="¿Los padres pueden limitar cuánto puede gastar su hijo?" answer="Sí. Pueden definir un límite monetario diario estricto, y si se supera en el recreo, el sistema del kiosco no le permite seguir comprando." />
            <FaqItem question="¿Quién compra el lector y las tarjetas RFID?" answer="El hardware y los insumos físicos los adquiere el kiosco o el colegio directamente de los proveedores. Kioedu asesora y asiste en elegir el equipamiento compatible homologado." />
            <FaqItem question="¿Kioedu ayuda con la implementación?" answer="Sí. El servicio incluye acompañamiento total de puesta en marcha, la configuración inicial de la cuenta y capacitación a tu personal para operar sin fricción." />
            <FaqItem question="¿El sistema funciona desde navegador?" answer="Sí. El Punto de Venta actual funciona como una plataforma web ágil que podés usar desde cualquier computadora conectada a internet." />
            <FaqItem question="¿Kioedu emite facturas oficiales?" answer="Sí. Kioedu cuenta con integración directa y transparente de facturación ARCA (ex AFIP)." />
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
            <motion.p variants={fadeUp} className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">Precios</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-[44px] font-black text-slate-900 mb-4 tracking-tight leading-tight">Tarifas transparentes</motion.h2>
            <motion.p variants={fadeUp} className="text-base sm:text-lg text-slate-500">Suscripción todo incluido. Sin costos ocultos, sin sorpresas.</motion.p>
          </AnimatedSection>

          <AnimatedSection className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Essential */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 flex flex-col">
              <h3 className="text-lg font-bold text-slate-900 mb-1">KioEdu Base</h3>
              <p className="text-sm text-slate-500 mb-6">La base ideal para modernizar la operación del kiosco escolar.</p>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-8">$35.000<span className="text-sm sm:text-base font-medium text-slate-400">/mes</span></div>
              <ul className="space-y-3.5 mb-8 flex-1">
                <PricingItem text="POS web y pagos con tarjeta RFID" />
                <PricingItem text="Cobro integrado con medios tradicionales" />
                <PricingItem text="App para padres incluida" />
                <PricingItem text="Recargas, límite diario y consumos" />
                <PricingItem text="Caja, ventas, categorías y productos" />
                <PricingItem text="Reportes básicos y facturación ARCA" />
                <PricingItem text="Soporte estándar" />
              </ul>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 no-underline text-sm">
                Hablar con ventas <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Premium */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl p-6 sm:p-8 border-[3px] border-brand-500 shadow-2xl shadow-brand-500/15 flex flex-col relative md:-translate-y-4">
              <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> Recomendado</div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">KioEdu Plus</h3>
              <p className="text-sm text-slate-500 mb-6">Más control, más gestión y una operación empresarial completa.</p>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-8">$75.000<span className="text-sm sm:text-base font-medium text-slate-400">/mes</span></div>
              <ul className="space-y-3.5 mb-8 flex-1">
                <PricingItem text="Todo lo incluido en KioEdu Base" />
                <PricingItem text="Auditoría operativa de usuarios" />
                <PricingItem text="Stock avanzado, órdenes y proveedores" />
                <PricingItem text="Múltiples usuarios, roles y permisos" />
                <PricingItem text="Reportes analíticos avanzados" />
                <PricingItem text="Soporte prioritario" />
              </ul>
              <a href="#contacto" className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 no-underline text-sm shadow-lg shadow-brand-500/25">
                Solicitar demo ahora <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection className="max-w-2xl mx-auto mt-10 text-center">
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Nota: Implementación inicial y hardware físico no están incluidos en el abono mensual.<br className="hidden sm:block" /> El hardware RFID es adquirido por el kiosco o el colegio.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ CONTACT FORM ═══════════ */}
      <ContactFormSection />

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 rounded-[2rem] p-8 sm:p-12 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-400/10 rounded-full blur-[100px] pointer-events-none" />
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-5 relative z-10 tracking-tight leading-tight">Transformá el kiosco escolar con más control y mejor gestión</h2>
            <p className="text-sm sm:text-base text-brand-200 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
              Incorporá pagos con RFID, app para padres y control de consumos sin dejar de usar los medios de cobro tradicionales.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 relative z-10">
              <a href="#contacto" className="bg-white text-brand-700 px-6 sm:px-8 py-3.5 rounded-xl font-black text-sm sm:text-base transition-all hover:bg-slate-50 hover:scale-[1.03] shadow-xl flex items-center justify-center gap-2 no-underline">
                <Store className="w-5 h-5" /> Solicitar demo
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 no-underline border border-white/20">
                <MessageCircle className="w-4 h-4" /> Hablar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-white border-t border-slate-100 py-8 sm:py-10 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <img src="/Logo/LogoKioEduSinFondo.svg" alt="KioEdu Logo" className="h-20 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
          </div>
          <p className="text-xs">&copy; 2026 Ecosistema KioEdu. Todos los derechos reservados.</p>
          <div className="flex gap-5 text-xs font-medium">
            <Link to="/terminos" className="hover:text-slate-900 no-underline text-slate-400 transition-colors">Términos</Link>
            <Link to="/privacidad" className="hover:text-slate-900 no-underline text-slate-400 transition-colors">Privacidad</Link>
            <Link to="/soporte" className="hover:text-slate-900 no-underline text-slate-400 transition-colors">Soporte</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ─── Subcomponents ─── */
function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div variants={fadeUp} className="group p-6 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-brand-200 hover:bg-white transition-all hover:shadow-lg hover:shadow-brand-900/5 cursor-default">
      <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </motion.div>
  )
}

function StepCard({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <motion.div variants={fadeUp} className="text-center relative">
      <div className="w-12 h-12 bg-white border border-brand-100 rounded-xl flex items-center justify-center text-brand-600 text-lg font-black mx-auto mb-4 shadow-lg shadow-brand-500/10 relative z-10 transition-transform hover:scale-110">
        {number}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </motion.div>
  )
}


function PricingItem({ text, light = false }: { text: string, light?: boolean }) {
  return (
    <li className={`flex items-center gap-2.5 ${light ? 'text-slate-300' : 'text-slate-600'}`}>
      <CheckCircle2 className={`w-4 h-4 shrink-0 ${light ? 'text-brand-400' : 'text-brand-500'}`} />
      <span className="text-sm">{text}</span>
    </li>
  )
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  return (
    <motion.details variants={fadeUp} className="group bg-white rounded-xl border border-slate-200 overflow-hidden">
      <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer list-none font-bold text-sm text-slate-800 hover:text-brand-600 transition-colors">
        <span className="flex items-center gap-3">
          <HelpCircle className="w-4 h-4 text-brand-400 shrink-0" />
          {question}
        </span>
        <span className="text-slate-300 group-open:rotate-45 transition-transform text-lg ml-4 shrink-0">+</span>
      </summary>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pl-12 text-sm text-slate-500 leading-relaxed">
        {answer}
      </div>
    </motion.details>
  )
}

function ContactFormSection() {
  const [formData, setFormData] = useState({ nombre: '', email: '', colegio: '', mensaje: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Build mailto link as fallback
    const subject = encodeURIComponent(`Consulta de ${formData.nombre} — ${formData.colegio}`);
    const body = encodeURIComponent(`Nombre: ${formData.nombre}\nEmail: ${formData.email}\nColegio: ${formData.colegio}\n\n${formData.mensaje}`);
    window.open(`mailto:soporte@KioEdu.com?subject=${subject}&body=${body}`, '_blank');
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <section id="contacto" className="py-20 sm:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 max-w-5xl mx-auto items-center">
          {/* Left - Copy */}
          <AnimatedSection>
            <motion.p variants={fadeUp} className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-3">Contacto</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-[40px] font-black text-slate-900 mb-4 tracking-tight leading-tight">¿Preferís que te contactemos?</motion.h2>
            <motion.p variants={fadeUp} className="text-slate-500 mb-8 leading-relaxed">
              Dejanos tus datos y un miembro de nuestro equipo se va a comunicar con vos para coordinar una demo personalizada.
            </motion.p>
            <motion.div variants={fadeUp} className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Te respondemos en menos de 24 horas</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Demo personalizada sin compromiso</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Te ayudamos a evaluar si KioEdu encaja en tu colegio o kiosco</span>
              </div>
            </motion.div>
          </AnimatedSection>

          {/* Right - Form */}
          <AnimatedSection>
            <motion.form variants={fadeUp} onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre completo</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} placeholder="Juan Pérez" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all placeholder:text-slate-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="juan@colegio.com" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all placeholder:text-slate-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Colegio / Institución</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="text" required value={formData.colegio} onChange={e => setFormData({ ...formData, colegio: e.target.value })} placeholder="Colegio San Martín" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all placeholder:text-slate-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mensaje <span className="text-slate-300 font-normal">(opcional)</span></label>
                <textarea value={formData.mensaje} onChange={e => setFormData({ ...formData, mensaje: e.target.value })} placeholder="Contanos sobre tu kiosco o colegio..." rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all resize-none placeholder:text-slate-300" />
              </div>
              <button type="submit" disabled={sent} className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${sent ? 'bg-emerald-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20'}`}>
                {sent ? (<><CheckCircle2 className="w-4 h-4" /> Mensaje enviado</>) : (<><Send className="w-4 h-4" /> Enviar consulta</>)}
              </button>
              <div className="pt-2 text-center">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-400 hover:text-brand-600 transition-colors">
                  <MessageCircle className="w-4 h-4" /> O contactanos directo por WhatsApp
                </a>
              </div>
            </motion.form>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

export default App;
