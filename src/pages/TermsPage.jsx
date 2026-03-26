// src/pages/TermsPage.jsx
// Public Términos y Condiciones page — accessible without login.

import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { WhatsAppButton } from '../components/WhatsAppButton'

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-[#1F4E29] text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/">
            <img src="/RafikiLogos03.png" alt="Rafiki" className="h-7" />
          </Link>
          <span className="text-sm font-medium text-white/80">Términos y Condiciones</span>
        </div>
      </nav>

      <main className="px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-6 sm:p-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Términos y Condiciones
            </h1>
            <p className="text-lg font-semibold text-muted-foreground mb-2">
              SERVICIOS COMERCIALES RAFIKI, S.A. DE C.V.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Última actualización: 16 de enero, 2022
            </p>

            <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 space-y-4">
              <p>
                Este contrato describe los términos y condiciones generales (en adelante "Términos y Condiciones")
                aplicables al uso de la plataforma, productos y servicios ofrecidos a través del sitio web
                https://www.rafiki.mx/ (el "Sitio") y su aplicación tecnológica (en adelante "App" o "Aplicación"),
                de los cuales es titular Servicios Comerciales RAFIKI, S.A. de C.V. (en adelante, "RAFIKI") quien tiene su
                domicilio establecido en la Ciudad de México, con dirección en Avenida Eurípides 1666, interior 17;
                Colonia El Refugio; Querétaro, Querétaro CP 76146.
              </p>

              {/* Section 1 */}
              <h2 className="text-xl font-bold mt-8 mb-3">1. Objeto</h2>
              <p>
                Al descargar y utilizar la App y/o el sitio web https://www.rafiki.mx/, el usuario reconoce que ha leído,
                entendido y aceptado en todas y cada una de su partes, los presentes Términos y Condiciones, los cuales, se
                compromete a cumplir y observar. RAFIKI se reserva el derecho de modificar en cualquier momento los presentes
                Términos y Condiciones, limitándose a informar al usuario (vía correo electrónico y/o a través de la App)
                sobre dicha modificación, por lo que el usuario deberá acceder al sitio web y/o a la App y en el apartado
                "Términos y Condiciones" consultar la actualización de los mismos. Las modificaciones serán efectivas una vez
                publicadas en la App y el sitio web, el acceso y/o uso del servicio después de dicha publicación constituye el
                consentimiento del usuario a las mismas.
              </p>
              <p>
                En caso de que el usuario no esté de acuerdo con los presentes Términos y Condiciones, y sus modificaciones,
                deberá abstenerse de utilizar el Sitio y la App.
              </p>

              {/* Section 2 */}
              <h2 className="text-xl font-bold mt-8 mb-3">2. Servicios</h2>
              <p>
                RAFIKI a través del Sitio y/o la Aplicación proporciona a los usuarios una plataforma tecnológica a través
                de la cual el usuario puede (a) organizar y planear procesos programados de rifa de diversos productos, que
                sean considerados comercializables de forma lícita, en los cuales puedan participar un número determinado
                (limitado) de terceros que pretendan adquirir dicho(s) producto(s) objeto de la rifa mediante el sorteo de
                números aleatorios que son adquiridos por otros usuarios a través del Sitio o la Aplicación; o (b) participar
                en un proceso de rifa de producto(s) determinado(s) que se encuentren disponibles a través del Sitio o la
                Aplicación, mediante la adquisición de uno o varios números que participen en el proceso de rifa
                correspondiente, los cuales serán sorteados aleatoriamente mediante el algoritmo propiedad de RAFIKI para
                asignar el número que resulte ganador de la rifa.
              </p>
              <p>
                El usuario que ofrezca los productos a través del proceso a que se refiere el inciso (a) del párrafo anterior,
                son y reconocen ser terceros independientes a RAFIKI, por lo que será, dicho usuario, responsable de tramitar,
                obtener y mantener vigentes los permisos, licencias y/o autorizaciones que fueren requeridas legalmente para la
                realización de los sorteos correspondientes.
              </p>
              <p>
                Los servicios ofrecidos por RAFIKI a través del Sitio y/o la Aplicación no están disponibles para personas
                menores de 18 (dieciocho) años de edad.
              </p>
              <p>
                Los usuarios que utilicen los servicios de RAFIKI referidos en el inciso (a) del primer párrafo de este numeral,
                son exclusivos responsables de la legalidad y legitimidad de los artículos que ofrezcan.
              </p>

              {/* Section 3 */}
              <h2 className="text-xl font-bold mt-8 mb-3">3. Propiedad intelectual e industrial</h2>
              <p>
                RAFIKI, es titular de todos los derechos de propiedad intelectual e industrial del Sitio y la Aplicación,
                entendiendo para los mismos el código fuente que hace posible su funcionamiento, así como las imágenes,
                archivos de audio o video, logotipos, marcas, combinaciones de colores, estructuras, diseños y demás elementos
                que lo distinguen. Serán, por consiguiente, protegidas por la legislación mexicana en materia de propiedad
                intelectual e industrial, así como por los tratados internacionales aplicables. Por consiguiente, queda
                expresamente prohibida la reproducción, distribución, o difusión de los contenidos del Sitio y/o la Aplicación,
                con fines comerciales, en cualquier soporte y por cualquier medio, sin la autorización de RAFIKI.
              </p>
              <p>
                El usuario se compromete a respetar los derechos de propiedad intelectual e industrial de RAFIKI. No obstante,
                además de poder visualizar los elementos del Sitio y/o la Aplicación podrá imprimirlos, copiarlos o
                almacenarlos, siempre y cuando sea exclusivamente para su uso estrictamente personal.
              </p>
              <p>
                Por otro lado, el usuario, se abstendrá de suprimir, alterar, o manipular cualquier elemento, archivo, o
                contenido, del Sitio y/o la Aplicación, y por ningún motivo realizará actos tendientes a vulnerar la seguridad,
                los archivos o bases de datos que se encuentren protegidos, ya sea a través de un acceso restringido mediante un
                usuario y contraseña, o porque no cuente con los permisos para visualizarlos, editarlos o manipularlos.
              </p>
              <p>
                En caso de que el usuario o algún tercero consideren que cualquiera de los contenidos del Sitio y/o la
                Aplicación suponga una violación de los derechos de protección de la propiedad industrial o intelectual,
                deberá comunicarlo inmediatamente a{' '}
                <a href="mailto:soporte@rafiki.mx" className="text-primary underline">soporte@rafiki.mx</a>
              </p>

              {/* Section 4 */}
              <h2 className="text-xl font-bold mt-8 mb-3">4. Acceso y uso de la App</h2>

              <h3 className="text-lg font-semibold mt-6 mb-2">A. Descarga y creación de cuenta</h3>
              <p>
                El usuario únicamente podrá acceder al Sitio y a la App a través de los medios autorizados. RAFIKI no será
                responsable en caso de que el usuario no disponga de un dispositivo compatible o haya descargado una versión de
                la Aplicación que sea incompatible con su dispositivo.
              </p>
              <p>
                Para acceder y utilizar la App, el usuario deberá descargarla de los sitios comercialmente conocidos como "App
                Store" y "Google Play". Una vez descargada la Aplicación, el usuario deberá crear y mantener una cuenta activa
                (en adelante "Cuenta"). Para obtener una Cuenta, el usuario deberá tener la edad mínima de 18 años y deberá
                proporcionar la siguiente información personal: nombre, número de teléfono móvil, correo electrónico y al menos
                un método de pago válido (bien una tarjeta de crédito o bien un socio de pago aceptado). Será obligación del
                usuario proporcionar y mantener la información en su Cuenta de forma veraz, exacta, completa y actualizada.
              </p>
              <p>
                El usuario será responsable de toda la actividad que ocurra en su Cuenta y se compromete a mantener en todo
                momento de forma segura y secreta el usuario y contraseña de su Cuenta.
              </p>
              <p>
                El usuario no podrá ceder o transferir de otro modo su Cuenta a cualquier otra persona o entidad. El usuario
                acuerda cumplir con todas las leyes aplicables al utilizar los servicios ofrecidos a través del Sitio y/o la
                Aplicación.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">B. Uso</h3>
              <p>
                Una vez finalizada la creación de la Cuenta, el usuario podrá hacer uso de la App y consultar toda la
                información relevante al servicio proporcionado por RAFIKI y recibir notificaciones. De igual forma, podrá
                participar en cualquiera de los procesos de rifa que se encuentren disponibles.
              </p>
              <p>
                En el Sitio y en la Aplicación se indicarán (i) el o los productos objeto de una determinada rifa; (ii) el
                precio que tendrá que pagar el usuario por cada número que desee adquirir para participar en el sorteo
                correspondiente; (iii) el número mínimo y máximo de participantes para una determinada rifa; (iv) la fecha en
                que se llevará a cabo el sorteo correspondiente.
              </p>
              <p>
                Las reglas aplicables a cada proceso de rifa serán fijadas por el usuario organizador, quien las hará del
                conocimiento de los usuarios participantes. Dicho usuario organizador acepta que:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Deberá tener habilitada una Cuenta con un perfil de usuario rifador y proporcionar la documentación necesaria, sujeta a validación por RAFIKI.</li>
                <li>Tendrá la opción de ingresar su RFC con homoclave para efectos de retención de ISR.</li>
                <li>Podrá asignar un valor al artículo objeto de rifa, no menor a $400.00 M.N. El monto estimado a generar deberá ser de al menos 3x y no mayor de 5x el valor asignado al producto.</li>
                <li>El costo de los boletos deberá ser de al menos $20.00 M.N.</li>
                <li>La duración del periodo de venta deberá ser de al menos 24 horas.</li>
                <li>Puede cancelar un evento de rifa sin costo si no se ha vendido algún boleto.</li>
                <li>Una vez vendido el porcentaje dinámico mínimo, no podrá cancelar el evento.</li>
                <li>Debe enviar el premio al ganador dentro de los 3 días hábiles siguientes y cargar el número de guía.</li>
                <li>Los recursos recaudados (menos comisiones e impuestos) serán entregados dentro de los 2 días hábiles siguientes a la confirmación de recepción.</li>
              </ul>
              <p>Penalizaciones por incumplimiento de envío:</p>
              <ol className="list-[lower-roman] pl-6 space-y-2">
                <li>Mora de envío: 1% diario del total recaudado por cada día hábil de retraso.</li>
                <li>Si no acredita envío en 10 días hábiles, se declara desierto el proceso.</li>
                <li>Al declararse desierto, el organizador pierde todo derecho.</li>
                <li>En caso de rifa desierta, el ganador recibirá el equivalente de los recursos del organizador.</li>
                <li>El ganador es responsable de los impuestos causados.</li>
              </ol>
              <p>
                RAFIKI podrá permitir al usuario cargar contenido, otorgando a RAFIKI una licencia mundial, perpetua e
                irrevocable sobre dicho contenido. El usuario declara ser propietario de todo el contenido que proporcione.
              </p>
              <p>
                El usuario se obliga a no proporcionar contenido difamatorio, violento, obsceno, pornográfico, ilícito o de
                otro modo ofensivo.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">C. Contraseña</h3>
              <p>
                Cada Cuenta será protegida por una contraseña. El usuario será responsable en todo momento del resguardo de su
                contraseña y asumirá daños derivados de su uso indebido o extravío. En caso de olvido, podrá recuperarla
                mediante el apartado "recuperar contraseña".
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">D. Pagos</h3>
              <p>
                El uso de los servicios puede derivar en cargos. En caso de no llevarse a cabo una rifa, RAFIKI efectuará el
                reembolso mediante el acreditamiento en el monedero electrónico de la App, cantidad que podrá ser utilizada en
                otros procesos de rifas.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">E. Acceso a la red / dispositivos</h3>
              <p>
                El usuario es responsable de obtener el acceso a la red de datos necesario. RAFIKI no garantiza funcionamiento
                en cualquier hardware o dispositivo particular. El servicio podrá ser objeto de disfunciones o retrasos sin
                responsabilidad para RAFIKI.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">F. Requisitos y conducta del usuario</h3>
              <p>
                El usuario se obliga a hacer un uso adecuado y lícito. El acceso está limitado a personas mayores de 18 años.
                El usuario no podrá ceder o transferir su cuenta. El acceso y uso son bajo su exclusiva responsabilidad.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">G. Mensajes de texto, llamadas y notificaciones</h3>
              <p>
                Al crear una cuenta, el usuario acepta recibir mensajes informativos. Puede solicitar la no recepción enviando
                correo a{' '}
                <a href="mailto:soporte@rafiki.mx" className="text-primary underline">soporte@rafiki.mx</a>
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-2">H. Modalidades de los usuarios en procesos de rifas</h3>
              <p>
                Los procesos de rifa son responsabilidad de los usuarios organizadores y participantes. RAFIKI no será
                responsable de controversias entre ellos.
              </p>

              {/* Section 5 */}
              <h2 className="text-xl font-bold mt-8 mb-3">5. Datos Personales</h2>
              <p>
                Los datos personales serán utilizados conforme al{' '}
                <Link to="/privacidad" className="text-primary underline">Aviso de Privacidad</Link>{' '}
                disponible en el Sitio.
              </p>

              {/* Section 6 */}
              <h2 className="text-xl font-bold mt-8 mb-3">6. Suspensión o cancelación del servicio</h2>
              <p>
                RAFIKI podrá suspender o cancelar la cuenta del usuario sin previo aviso en caso de: información falsa o
                fraudulenta; contenido ofensivo o ilícito; uso con fines ilegales o perjudiciales; o cualquier violación a estos
                Términos y Condiciones.
              </p>

              {/* Section 7 */}
              <h2 className="text-xl font-bold mt-8 mb-3">7. Responsabilidades</h2>
              <p>
                RAFIKI no será responsable por daños derivados de: falta de accesibilidad o interrupciones; virus informáticos;
                acciones no autorizadas de usuarios. RAFIKI tampoco será responsable de pérdidas por participación en sorteos
                no ganados.
              </p>

              {/* Section 8 */}
              <h2 className="text-xl font-bold mt-8 mb-3">8. Notificaciones</h2>
              <p>
                RAFIKI podrá enviar notificaciones mediante la Aplicación, correo electrónico y/o SMS. El usuario podrá
                contactar a RAFIKI en{' '}
                <a href="mailto:soporte@rafiki.mx" className="text-primary underline">soporte@rafiki.mx</a>
              </p>

              {/* Section 9 */}
              <h2 className="text-xl font-bold mt-8 mb-3">9. Contacto para consultas, aclaraciones o reclamaciones</h2>
              <p>
                Para dudas o reclamaciones:{' '}
                <a href="mailto:soporte@rafiki.mx" className="text-primary underline">soporte@rafiki.mx</a>{' '}
                o la sección "Ayuda y soporte" en la App. RAFIKI dará seguimiento dentro de las 48 horas siguientes.
              </p>

              {/* Section 10 */}
              <h2 className="text-xl font-bold mt-8 mb-3">10. Ley aplicable y jurisdicción</h2>
              <p>
                Las controversias serán resueltas en arbitraje conforme al Reglamento de Arbitraje de la Cámara de Comercio
                Internacional, por un solo árbitro, en la Ciudad de México, en idioma español, aplicando la legislación federal
                mexicana.
              </p>

              <div className="mt-8 pt-6 border-t">
                <p className="font-medium">
                  Contacto:{' '}
                  <a href="mailto:soporte@rafiki.mx" className="text-primary underline">soporte@rafiki.mx</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-4xl mx-auto mt-6 mb-8 text-center text-sm text-muted-foreground space-y-2">
          <p>
            <Link to="/privacidad" className="underline hover:text-foreground">
              Aviso de Privacidad
            </Link>
          </p>
          <p>&copy; 2026 Servicios Comerciales Rafiki</p>
        </div>
      </main>

      <WhatsAppButton />
    </div>
  )
}
