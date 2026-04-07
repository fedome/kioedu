import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Mail, Clock, HelpCircle, FileText, Shield } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/5491162558127?text=Hola%2C%20necesito%20soporte%20de%20Kio';

export default function Support() {
  return (
    <div className="min-h-screen font-sans bg-slate-50">
      {/* Mini Navbar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-brand-600 transition-colors no-underline font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-600 to-indigo-400 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow">K</div>
            <span className="font-black text-slate-800">KioEdu</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Centro de Soporte</h1>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">Estamos para ayudarte. Elegí el canal que más te convenga y te respondemos lo antes posible.</p>
        </div>

        {/* Contact Cards */}
        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="group p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5 transition-all no-underline">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">WhatsApp</h3>
            <p className="text-sm text-slate-500 mb-3">La forma más rápida de contactarnos. Respondemos en minutos.</p>
            <span className="text-sm font-bold text-emerald-600">Abrir chat →</span>
          </a>

          <a href="mailto:support@kioscoedu.com" className="group p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-900/5 transition-all no-underline">
            <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 mb-4 group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Email</h3>
            <p className="text-sm text-slate-500 mb-3">Para consultas formales o documentación detallada.</p>
            <span className="text-sm font-bold text-brand-600">support@kioscoedu.com →</span>
          </a>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-bold text-slate-800">Horarios de Atención</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="font-bold text-sm text-slate-800">Lunes a Viernes</p>
              <p className="text-sm text-slate-500">8:00 a 18:00 hs (Hora Argentina)</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="font-bold text-sm text-slate-800">Sábados</p>
              <p className="text-sm text-slate-500">9:00 a 13:00 hs (Hora Argentina)</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-bold text-slate-800">Preguntas Frecuentes</h2>
          </div>
          <div className="space-y-4">
            <FaqItem
              question="¿Cómo empiezo a usar KioEdu en mi colegio?"
              answer="Contactanos por WhatsApp o email. Te agendamos una demostración gratuita, y si decidís contratar, nosotros nos encargamos de la instalación completa del sistema y la entrega de las tarjetas RFID."
            />
            <FaqItem
              question="¿Qué pasa si se corta internet en el kiosco?"
              answer="El sistema POS funciona sin conexión a Internet. Registra todas las ventas localmente y cuando vuelve la conexión, sincroniza todo automáticamente con el servidor."
            />
            <FaqItem
              question="¿Cómo recargan saldo los padres?"
              answer="Los padres descargan la app de KioEdu, vinculan a su hijo con el código del colegio, y cargan saldo mediante MercadoPago u otros medios disponibles. La acreditación es automática."
            />
            <FaqItem
              question="¿Puedo cancelar mi suscripción en cualquier momento?"
              answer="Sí, podés cancelar tu suscripción cuando quieras. La cancelación se hace efectiva al final del período mensual que ya pagaste. No hay penalidades ni costos ocultos."
            />
            <FaqItem
              question="¿KioEdu emite facturas oficiales?"
              answer="Sí, KioEdu se integra directamente con ARCA (ex AFIP) para emitir Ticket Factura C homologados de forma automática, cumpliendo con toda la normativa fiscal argentina vigente."
            />
            <FaqItem
              question="¿Mis datos están seguros?"
              answer="Absolutamente. Usamos cifrado de contraseñas, conexiones HTTPS, tokens de autenticación con expiración, y monitoreo en vivo de toda la infraestructura. Cumplimos con la Ley 25.326 de Protección de Datos Personales."
            />
          </div>
        </div>

        {/* Links */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/terminos" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-600 transition-colors no-underline">
            <FileText className="w-4 h-4" /> Términos y Condiciones
          </Link>
          <Link to="/privacidad" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-600 transition-colors no-underline">
            <Shield className="w-4 h-4" /> Política de Privacidad
          </Link>
        </div>
      </main>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  return (
    <details className="group bg-white rounded-xl border border-slate-200 overflow-hidden">
      <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer list-none font-bold text-sm text-slate-800 hover:text-brand-600 transition-colors">
        {question}
        <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg ml-4">+</span>
      </summary>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-slate-600 leading-relaxed">
        {answer}
      </div>
    </details>
  )
}
