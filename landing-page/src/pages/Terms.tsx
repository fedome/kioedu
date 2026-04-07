import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/5491100000000?text=Hola%2C%20quiero%20info%20sobre%20Kio%20para%20mi%20colegio';

export default function Terms() {
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
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">Términos y Condiciones</h1>
        <p className="text-sm text-slate-400 mb-10">Última actualización: Abril 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">1. Aceptación de los Términos</h2>
            <p className="text-slate-600 leading-relaxed">
              Al acceder y utilizar los servicios de KioEdu (incluyendo el Punto de Venta, la Aplicación para Padres, el Panel de Administración y cualquier servicio relacionado), usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguno de estos términos, no debe utilizar nuestros servicios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">2. Descripción del Servicio</h2>
            <p className="text-slate-600 leading-relaxed">
              KioEdu es un ecosistema de gestión integral para kioscos escolares que incluye:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
              <li>Sistema de Punto de Venta (POS) web para la gestión de ventas en kioscos escolares.</li>
              <li>Aplicación móvil para padres que permite la consulta de consumos y la recarga de saldo.</li>
              <li>Panel de administración para la gestión centralizada de colegios, usuarios y reportes.</li>
              <li>Integración con sistemas de pago electrónico (MercadoPago) y facturación fiscal (ARCA).</li>
              <li>Sistema de identificación mediante tarjetas y llaveros RFID.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">3. Suscripción y Pagos</h2>
            <p className="text-slate-600 leading-relaxed">
              El acceso a los servicios de KioEdu se realiza mediante una suscripción mensual. Los precios son los publicados en nuestra página web al momento de la contratación. El servicio se renueva automáticamente cada mes salvo que el cliente solicite la baja. En caso de falta de pago, KioEdu se reserva el derecho de suspender temporalmente el acceso al servicio hasta la regularización.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">4. Uso Aceptable</h2>
            <p className="text-slate-600 leading-relaxed">
              El cliente se compromete a utilizar KioEdu exclusivamente para la gestión comercial de kioscos escolares de manera lícita. Queda prohibido el uso del sistema para actividades fraudulentas, la reventa del servicio a terceros sin autorización, o cualquier acción que pueda comprometer la seguridad o integridad de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Responsabilidad</h2>
            <p className="text-slate-600 leading-relaxed">
              KioEdu se compromete a mantener la disponibilidad del servicio en la medida de lo técnicamente posible. No obstante, no se responsabiliza por interrupciones causadas por fuerza mayor, fallas de conexión a internet del cliente, o problemas con proveedores de servicios de terceros (MercadoPago, ARCA). El cliente es responsable de la veracidad de los datos ingresados en el sistema y del correcto uso del hardware proporcionado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">6. Propiedad Intelectual</h2>
            <p className="text-slate-600 leading-relaxed">
              Todo el software, diseño, código fuente, interfaces y documentación de KioEdu son propiedad exclusiva de sus desarrolladores. La suscripción otorga una licencia de uso limitada y no transferible del sistema durante la vigencia del contrato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">7. Cancelación</h2>
            <p className="text-slate-600 leading-relaxed">
              El cliente puede cancelar su suscripción en cualquier momento notificando al equipo de soporte. La cancelación será efectiva al finalizar el período mensual ya abonado. No se realizan reembolsos proporcionales por períodos parciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">8. Modificaciones</h2>
            <p className="text-slate-600 leading-relaxed">
              KioEdu se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones serán comunicadas a los clientes por correo electrónico o mediante aviso en la plataforma con al menos 15 días de anticipación a su entrada en vigencia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">9. Jurisdicción</h2>
            <p className="text-slate-600 leading-relaxed">
              Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia derivada del uso del servicio será sometida a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">¿Tenés dudas sobre estos términos?</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors no-underline">
            Consultanos por WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
