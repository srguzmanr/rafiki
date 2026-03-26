// src/pages/PrivacyPage.jsx
// Public Aviso de Privacidad page — accessible without login.

import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-[#1F4E29] text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/">
            <img src="/RafikiLogos03.png" alt="Rafiki" className="h-7" />
          </Link>
          <span className="text-sm font-medium text-white/80">Aviso de Privacidad</span>
        </div>
      </nav>

      <main className="px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-6 sm:p-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Aviso de Privacidad para la Protección de Datos Personales
            </h1>
            <p className="text-lg font-semibold text-muted-foreground mb-2">
              SERVICIOS COMERCIALES RAFIKI, S.A. DE C.V.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Última actualización: 16 de enero, 2022
            </p>

            <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 space-y-4">
              <p>
                El presente Aviso tiene por objeto la protección de sus datos personales, mediante su tratamiento
                legítimo, controlado e informado, a efecto de garantizar su privacidad, así como su derecho
                a la autodeterminación informativa.
              </p>
              <p>
                RAFIKI, informa a Usted a continuación los términos en que serán tratados los Datos
                Personales que recabe, por lo cual, le recomendamos que lea atentamente la siguiente información:
              </p>
              <p>
                En términos de lo previsto en la Ley Federal de Protección de Datos Personales en
                Posesión de los Particulares, la aportación que hagas de sus datos Personales a RAFIKI
                constituye la aceptación de estos Términos y Condiciones.
              </p>

              <h2 className="text-xl font-bold mt-8 mb-3">1. Identidad y domicilio del responsable</h2>
              <p>
                SERVICIOS COMERCIALES RAFIKI, S.A. DE C.V. manifiesta que es una sociedad legalmente constituida bajo las
                leyes mexicanas y responderá individualmente de los Datos Personales que recabe y señala como
                domicilio para todos los efectos y obligaciones relacionadas con el presente AVISO DE PRIVACIDAD el inmueble
                ubicado en Avenida Eurípides 1666 No. 17, Colonia El Refugio, Querétaro, Querétaro 76146.
              </p>

              <h2 className="text-xl font-bold mt-8 mb-3">2. Definiciones</h2>
              <p>
                Para efectos del presente AVISO DE PRIVACIDAD, los términos que se indican a continuación
                tendrán los significados que en este documento se señalan, ya sea que estén redactados
                en singular o en plural:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>"Datos Personales":</strong> Conforme al artículo 3, fracción V, de la
                  Ley, se entiende por Datos Personales: Cualquier información concerniente a una persona física
                  identificada o identificable.
                </li>
                <li>
                  <strong>"Derechos ARCO":</strong> Derecho del Titular de los Datos Personales al solicitar al
                  Responsable el Acceso, Rectificación, Cancelación u Oposición respecto de dichos datos,
                  conforme a lo previsto en la LFPDPPP y su Reglamento.
                </li>
                <li>
                  <strong>"Disociación":</strong> El procedimiento mediante el cual los Datos Personales no
                  pueden asociarse al Titular ni permitir, por su estructura, contenido o grado de desagregación, la
                  identificación del mismo.
                </li>
                <li>
                  <strong>"Encargado":</strong> La persona física o moral que sola o conjuntamente con otras
                  personas físicas o morales trate Datos Personales a nombre y mediante instrucción del
                  Responsable, conforme a los procesos, términos y condiciones que este le señale.
                </li>
                <li>
                  <strong>"LFPDPPP":</strong> Ley Federal de Protección de Datos Personales en
                  Posesión de los Particulares.
                </li>
                <li>
                  <strong>"Reglamento":</strong> Reglamento de la Ley Federal de Protección de Datos
                  Personales en Posesión de los Particulares.
                </li>
                <li>
                  <strong>"Responsable":</strong> RAFIKI
                </li>
                <li>
                  <strong>"Titular":</strong> La persona física a quien corresponden los Datos Personales.
                </li>
                <li>
                  <strong>"Transferencia":</strong> La comunicación de Datos Personales dentro o fuera del
                  territorio nacional, realizada a persona distinta del Titular o del Responsable.
                </li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-3">3. Datos personales recabados por el responsable</h2>
              <p>
                Para el cumplimiento de las finalidades señaladas en el numeral 4 del presente AVISO DE PRIVACIDAD, el
                Responsable le informa que recabará las siguientes categorías de Datos Personales: (i) Datos de
                Identificación; (ii) Datos de Contacto.
              </p>

              <h2 className="text-xl font-bold mt-8 mb-3">4. Finalidades del tratamiento de los datos</h2>
              <p>
                RAFIKI, de conformidad a lo dispuesto por la fracción I del artículo 16 de la Ley, será el
                Responsable de su información personal (Datos Personales). RAFIKI hará uso de los datos para fines
                únicamente editoriales y estadísticos, así como para enviarle información
                concerniente a actualizaciones de los productos y servicios ofrecidos por RAFIKI, así como para enviarle
                invitaciones, promociones o información general de dichos productos y servicios.
              </p>
              <p>
                Al participar en el proceso de suscripción a la plataforma operada por RAFIKI, RAFIKI queda autorizado
                para utilizar y tratar de forma automatizada sus datos personales e información suministrada, los cuales
                formarán parte de nuestra base de datos con la finalidad de usarlos en forma enunciativa, más no
                limitativa para: identificarle, comunicarle, contactarle, enviarle información, actualizar nuestra base de
                datos y obtener estadísticas.
              </p>
              <p>
                La temporalidad del manejo de tus Datos Personales será indefinida a partir de la fecha en que nos sean
                proporcionados por usted.
              </p>
              <p>
                RAFIKI, como responsable del tratamiento de tus datos personales, está obligada a cumplir con los
                principios de licitud, consentimiento, información, calidad, finalidad, lealtad, proporcionalidad y
                responsabilidad tutelados en la Ley; por tal motivo con fundamento en los artículos 13 y 14 de la Ley,
                RAFIKI se compromete a tratar su información con normas de confidencialidad y seguridad administrativa.
              </p>
              <p>
                En términos de lo establecido por el artículo 22 de la Ley, tiene derecho en cualquier momento a
                ejercer tus derechos de acceso, rectificación, cancelación y oposición al tratamiento de tus
                datos personales.
              </p>

              <h2 className="text-xl font-bold mt-8 mb-3">
                5. Medios para ejercer los derechos de acceso, rectificación, cancelación u oposición (Derechos ARCO)
              </h2>
              <p>
                En caso de que requiera algún cambio deberá enviar un correo a{' '}
                <a href="mailto:soporte@rafiki.mx" className="text-primary underline">soporte@rafiki.mx</a>
              </p>
              <p>
                En cumplimiento al artículo 29 de la Ley, dicha solicitud deberá contener los siguientes datos:
              </p>
              <ol className="list-[lower-alpha] pl-6 space-y-2">
                <li>su nombre y domicilio u otro medio para comunicarle la respuesta a su solicitud;</li>
                <li>
                  los documentos que acrediten su identidad o, en su caso, la representación legal de la persona que
                  realiza la solicitud a su nombre;
                </li>
                <li>
                  la descripción clara y precisa de los datos personales respecto de los que busca ejercer alguno de los
                  derechos mencionados en el párrafo anterior; y
                </li>
                <li>cualquier otro elemento o documento que facilite la localización de sus datos personales.</li>
              </ol>
              <p>
                En caso de solicitar la rectificación de datos personales, adicionalmente deberá indicar las
                modificaciones a realizarse y aportar la documentación que sustente su petición. La respuesta a su
                solicitud se le comunicará en un plazo de veinte días hábiles, contados desde la fecha en
                que se recibió, pudiendo ampliarse a veinte días más en los casos que así lo
                establezcan la Ley; a efecto de que de resultar procedente, se lleven a cabo las medidas adoptadas para cumplir
                con su solicitud, mismas que se llevarán a cabo dentro de los quince días hábiles
                siguientes a la fecha en que se comunique la respuesta.
              </p>
              <p>
                Le sugerimos conocer y analizar el contenido de la Ley Federal de Protección de Datos Personales en
                Posesión de los Particulares pues pueden generarse cambios normativos a los que estamos sujetos.
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
            <Link to="/terminos" className="underline hover:text-foreground">
              Términos y Condiciones
            </Link>
          </p>
          <p>&copy; 2026 Servicios Comerciales Rafiki</p>
        </div>
      </main>
    </div>
  )
}
