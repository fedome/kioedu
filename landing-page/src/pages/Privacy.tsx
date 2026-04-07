import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/5491100000000?text=Hola%2C%20quiero%20info%20sobre%20Kio%20para%20mi%20colegio';

export default function Privacy() {
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
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-slate-400 mb-10">Última actualización: Abril 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">1. Información que Recopilamos</h2>
            <p className="text-slate-600 leading-relaxed">
              KioEdu recopila únicamente la información necesaria para brindar el servicio:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
              <li><strong>Datos de los padres/tutores:</strong> Nombre, apellido, correo electrónico y datos de contacto para el acceso a la aplicación.</li>
              <li><strong>Datos de los alumnos:</strong> Nombre, apellido, grado/división y colegio al que pertenecen. No se recopilan datos sensibles de menores.</li>
              <li><strong>Datos de transacciones:</strong> Historial de compras, recargas de saldo y movimientos de la billetera virtual.</li>
              <li><strong>Datos del kiosco:</strong> Información comercial del operador, datos de facturación fiscal (CUIT, condición frente al IVA).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">2. Cómo Usamos la Información</h2>
            <p className="text-slate-600 leading-relaxed">
              Utilizamos los datos recopilados exclusivamente para:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
              <li>Procesar ventas y transacciones en el punto de venta.</li>
              <li>Enviar notificaciones a los padres sobre los consumos de sus hijos.</li>
              <li>Generar reportes y estadísticas para los operadores de kiosco.</li>
              <li>Emitir comprobantes fiscales según la normativa ARCA/AFIP vigente.</li>
              <li>Mejorar el funcionamiento y la seguridad de la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">3. Protección de Datos</h2>
            <p className="text-slate-600 leading-relaxed">
              Implementamos medidas de seguridad técnicas y organizativas para proteger los datos personales contra el acceso no autorizado, la pérdida o la alteración. Esto incluye el cifrado de contraseñas (bcrypt), conexiones seguras mediante HTTPS, tokens de autenticación con expiración temporal (JWT), y monitoreo continuo de la infraestructura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">4. Datos de Menores</h2>
            <p className="text-slate-600 leading-relaxed">
              KioEdu cumple con la Ley 25.326 de Protección de Datos Personales de Argentina. Los datos de menores de edad se recopilan con el consentimiento de sus padres o tutores legales a través de la aplicación. No recopilamos más información de la estrictamente necesaria para identificar al alumno dentro del sistema escolar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Compartir Información</h2>
            <p className="text-slate-600 leading-relaxed">
              No vendemos ni compartimos datos personales con terceros con fines comerciales. Solo compartimos información con:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
              <li><strong>MercadoPago:</strong> Para procesar recargas y pagos electrónicos (según sus propios términos).</li>
              <li><strong>ARCA (ex AFIP):</strong> Para la emisión de comprobantes fiscales según la legislación tributaria vigente.</li>
              <li><strong>Autoridades judiciales:</strong> Cuando sea requerido por orden judicial o ley vigente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">6. Retención de Datos</h2>
            <p className="text-slate-600 leading-relaxed">
              Los datos personales se conservan mientras la relación comercial esté vigente y durante el plazo legal que corresponda para cumplir con obligaciones fiscales y contables. Una vez finalizada la suscripción, los datos pueden ser anonimizados o eliminados a solicitud del cliente, salvo aquellos que deban conservarse por obligación legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">7. Derechos del Usuario</h2>
            <p className="text-slate-600 leading-relaxed">
              De acuerdo con la legislación argentina, usted tiene derecho a acceder, rectificar, actualizar y solicitar la supresión de sus datos personales. Para ejercer estos derechos, puede contactarnos a través de nuestros canales de soporte. Responderemos en un plazo máximo de 10 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">8. Cookies y Tecnologías</h2>
            <p className="text-slate-600 leading-relaxed">
              Nuestras aplicaciones web pueden utilizar almacenamiento local (localStorage) para mantener la sesión del usuario y preferencias de configuración. No utilizamos cookies de seguimiento de terceros ni herramientas de publicidad personalizada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">9. Cambios en esta Política</h2>
            <p className="text-slate-600 leading-relaxed">
              Nos reservamos el derecho de actualizar esta Política de Privacidad. Notificaremos a los usuarios sobre cambios significativos con al menos 15 días de anticipación a través de la plataforma o por correo electrónico.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">¿Tenés consultas sobre el manejo de tus datos?</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors no-underline">
            Contactanos por WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
