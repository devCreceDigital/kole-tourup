"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function RootPage() {
  const [activeTab, setActiveTab] = useState("Itinerario");
  const tabs = ["Itinerario", "Pagos", "Alojamiento", "Presupuesto"];

  return (
    <>
      {/* TopNavBar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-outline-variant/30 sticky top-0 z-50 transition-all duration-300">
        <div className="flex justify-between items-center w-full px-4 md:px-margin-desktop h-20 max-w-container-max mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300">
              <span className="material-symbols-outlined font-bold">explore</span>
            </div>
            <span className="text-headline-md font-headline-md font-extrabold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Tottem Hub</span>
          </div>
          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex gap-1 bg-surface-container-low/50 p-1 rounded-full border border-outline-variant/30 relative">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(tab);
                }}
                className={`relative px-5 py-2 rounded-full text-sm transition-colors duration-300 cursor-pointer font-semibold ${
                  activeTab === tab
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-primary hover:bg-white/40"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white rounded-full shadow-sm"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </nav>
          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="cursor-pointer bg-primary text-white font-label-md py-2.5 px-6 rounded-full hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 transform hover:-translate-y-0.5 hidden sm:block">
              Inscribirse
            </button>
            <button className="cursor-pointer text-on-surface-variant hover:text-primary bg-surface-container-low hover:bg-surface-container-highest transition-all duration-300 flex items-center justify-center w-10 h-10 rounded-full">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative w-full h-auto py-20 md:py-32 bg-gradient-to-b from-surface-container-highest/30 to-background overflow-hidden flex items-center justify-center">
        {/* Decorative background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center gap-6">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-2xl mb-2 border border-primary/20">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
              <span className="material-symbols-outlined text-white text-2xl fill">flight_takeoff</span>
            </div>
            <span className="ml-3 mr-4 font-bold text-primary text-sm uppercase tracking-wider">EduTrip 2026</span>
          </div>
          
          <h1 className="font-headline-xl text-[36px] md:text-[56px] leading-[1.1] text-on-surface font-extrabold tracking-tight">
            PRÓXIMA EXPEDICIÓN 2026:<br />
            <span className="bg-gradient-to-r from-primary via-blue-600 to-primary bg-clip-text text-transparent">Barcelona, Pirineos &amp; Port Aventura</span>
          </h1>
          
          <p className="font-body-lg text-body-lg text-on-surface-variant bg-white/60 px-8 py-3 rounded-full backdrop-blur-md shadow-sm border border-white/40 inline-block font-medium">
            Exclusivo para alumnos de 4º ESO del IES IBN JALDUN
          </p>
          
          <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center">
            <button className="cursor-pointer bg-primary text-white font-label-md py-4 px-10 rounded-full shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-105 transition-all duration-300 text-lg font-bold flex items-center gap-2">
              Inscribir a mi hij@
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button className="cursor-pointer bg-white text-on-surface hover:bg-surface-container-lowest font-label-md py-4 px-8 rounded-full shadow-md border border-outline-variant/30 transition-all duration-300 text-lg font-bold flex items-center gap-2">
              Ver Itinerario
            </button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-on-surface-variant font-label-md text-sm bg-white/40 px-8 py-4 rounded-2xl backdrop-blur-md border border-white/50">
            <span className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-primary text-[18px]">star</span></div> Gestión 100% Online</span>
            <span className="hidden md:block text-outline-variant/50">|</span>
            <span className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-primary text-[18px]">security</span></div> Seguridad Total</span>
            <span className="hidden md:block text-outline-variant/50">|</span>
            <span className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-primary text-[18px]">credit_card</span></div> Pago Fraccionado</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent"></div>
      </section>

      {/* Main Layout Grid */}
      <main className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col lg:flex-row gap-gutter relative">
        {/* Main Content Column */}
        <div className="flex-1 flex flex-col gap-stack-lg">
          {/* Trip Summary Info Bar */}
          <div className="flex flex-col sm:flex-row justify-between bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant gap-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-1">location_on</span>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Destinos</p>
                <p className="font-body-lg text-body-lg text-on-surface font-semibold">Barcelona / Pirineos / Port Aventura</p>
              </div>
            </div>
            <div className="hidden sm:block w-px bg-outline-variant"></div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-1">calendar_month</span>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Fecha</p>
                <p className="font-body-lg text-body-lg text-on-surface font-semibold">17/06/2026 (6 Días)</p>
              </div>
            </div>
          </div>

          {/* Por qué viajar con nosotros Section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">verified</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Por qué viajar con nosotros</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bloque Confianza */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0 text-primary">
                  <span className="material-symbols-outlined text-[24px]">health_and_safety</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-body-lg font-bold text-on-surface mb-2">Viaja tranquilo</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Incluye seguro de asistencia médica y responsabilidad civil.</p>
                </div>
              </div>
              {/* Facilidades */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0 text-primary">
                  <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-body-lg font-bold text-on-surface mb-2">Financia el viaje sin estrés</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Divide el pago hasta en 4 cómodas cuotas o usa Plazox para fraccionar a tu ritmo.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Dates to Remember Section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">event_note</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Fechas a recordar</h2>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold uppercase tracking-wider">Concepto</th>
                      <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold uppercase tracking-wider">Importe</th>
                      <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant font-semibold uppercase tracking-wider">Antes de</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md text-on-surface">
                    <tr className="border-b border-outline-variant/50 hover:bg-surface-bright transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="material-symbols-outlined text-secondary text-sm">payments</span>
                          Reserva de plaza
                        </div>
                        <div className="text-sm text-on-surface-variant mt-1">Necesaria para confirmar reserva</div>
                      </td>
                      <td className="py-4 px-6 font-semibold">200,00€</td>
                      <td className="py-4 px-6">17/03/2026</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50 hover:bg-surface-bright transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="material-symbols-outlined text-secondary text-sm">payments</span>
                          2º Pago
                        </div>
                        <div className="text-sm text-on-surface-variant mt-1">Correspondiente al tipo de viaje</div>
                      </td>
                      <td className="py-4 px-6 font-semibold">200,00€</td>
                      <td className="py-4 px-6">17/04/2026</td>
                    </tr>
                    <tr className="hover:bg-surface-bright transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="material-symbols-outlined text-secondary text-sm">payments</span>
                          Pago Final
                        </div>
                        <div className="text-sm text-on-surface-variant mt-1">Último pago</div>
                      </td>
                      <td className="py-4 px-6 font-semibold">450,00€</td>
                      <td className="py-4 px-6">17/05/2026</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Hero Image Section */}
          <div className="w-full h-64 md:h-96 rounded-xl overflow-hidden shadow-sm relative group">
            <img alt="Barcelona Landmark" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" data-alt="A sweeping, high-quality, bright and sunny panoramic view of the Sagrada Familia in Barcelona, Spain. The image should feature a clear blue sky, modern light-mode aesthetic, vibrant but natural colors. Focus on the architectural details against a serene background, evoking a sense of exciting educational travel. High contrast, clean, premium corporate travel style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDgSR-i86DBXAK9PBikcM34E1VxgGJdlvFCpnt1Fp-OQAq0pe8bveZqnjMjXtmOhznfakLZDN3eoK0ztagow9uC7EvKSJreH2O1iY7Os9-9S9Zv7dI0f3dLWZO1CGQxP5_n7j4xJSRUqLmTmKVIxjSDoDNusQeM83axff2INOH5qUqkSdWkGIWyglgjzy31glV7jTktvg5cHSG-yygPZCmhVWcm7e4aqCxfsJ-jxyHm2VRfcwRuy6Xv5O0XU885a8ezAOvtOVfz5I" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-white font-headline-md text-headline-md font-semibold">Barcelona, España</p>
            </div>
          </div>

          {/* Itinerary Section */}
          <section className="flex flex-col gap-6 mt-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl transform -rotate-45">route</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">¡Conoce el itinerario!</h2>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              {/* Day Header */}
              <div className="bg-surface-container-low px-6 py-4 flex items-center justify-between border-b border-outline-variant cursor-pointer hover:bg-surface-container-highest transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">today</span>
                  <h3 className="font-headline-md text-body-lg font-bold text-on-surface">Día 1: ¡Bienvenidos a Barcelona!</h3>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">expand_less</span>
              </div>
              {/* Day Content (Timeline) */}
              <div className="p-6 bg-surface-container-lowest">
                <p className="font-label-md text-label-md text-on-surface-variant mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">event</span>
                  Miércoles, 17 Junio, 2026
                </p>
                <div className="relative border-l-2 border-outline-variant/30 ml-3 pl-8 flex flex-col gap-8 pb-4">
                  {/* Timeline Item 1 */}
                  <div className="relative">
                    <div className="absolute -left-[41px] top-1 w-5 h-5 bg-surface-container-lowest border-2 border-primary rounded-full z-10 shadow-sm flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                    <h4 className="font-headline-md text-body-lg font-bold text-on-surface mb-1">10:00h - Llegada al hotel</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">Llegada al alojamiento designado. Check-in y distribución de las habitaciones para el grupo escolar.</p>
                  </div>
                  {/* Timeline Item 2 */}
                  <div className="relative">
                    <div className="absolute -left-[41px] top-1 w-5 h-5 bg-surface-container-lowest border-2 border-outline-variant rounded-full z-10 shadow-sm"></div>
                    <h4 className="font-headline-md text-body-lg font-bold text-on-surface mb-1">12:30h - Visita Guiada: Sagrada Familia</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                      Inicio de nuestro recorrido cultural por la ciudad condal. Nuestra primera parada será la emblemática obra maestra de Antoni Gaudí. Acompañados por un guía experto local, los estudiantes descubrirán los secretos arquitectónicos, la historia y la simbología de las impresionantes fachadas.
                    </p>
                    <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/50 text-sm text-on-surface-variant mt-2">
                      <p className="mb-2"><strong>Nota importante:</strong> Se ruega puntualidad. La entrada incluye auriculares para seguir las explicaciones del guía sin problemas en zonas concurridas.</p>
                      <p className="">Posteriormente, disfrutaremos de tiempo libre para almorzar (no incluido) en los alrededores, antes de continuar nuestro paseo por el Passeig de Gràcia para admirar las famosas Casa Batlló y La Pedrera desde el exterior.</p>
                    </div>
                  </div>
                  {/* Timeline Item 3 */}
                  <div className="relative">
                    <div className="absolute -left-[41px] top-1 w-5 h-5 bg-surface-container-lowest border-2 border-outline-variant rounded-full z-10 shadow-sm"></div>
                    <h4 className="font-headline-md text-body-lg font-bold text-on-surface mb-1">18:00h - Regreso y Cena</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">Regreso al hotel para descansar. Cena de grupo incluida en el alojamiento y tiempo libre supervisado en las instalaciones.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar (Shared Components + Extra Cards) */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-stack-lg relative">
          {/* SideNavBar Component Equivalent */}
          <div className="bg-surface-container-low dark:bg-surface-dim rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col gap-4">
            <div className="text-center mb-2">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Inscríbete ahora</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Últimas plazas para Barcelona</p>
            </div>
            <button className="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all duration-200 font-label-md text-label-md font-bold py-3 px-4 rounded-full shadow-sm">
              Ver Presupuesto
            </button>
            <button className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-highest transition-all duration-200 font-label-md text-label-md font-bold py-3 px-4 rounded-full shadow-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">mail</span>
              Contactar
            </button>
          </div>

          {/* Registration CTA Card */}
          <div className="bg-inverse-surface text-surface-container-lowest rounded-xl p-6 shadow-md flex flex-col items-center text-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-container/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <h3 className="font-headline-md text-headline-md font-bold">Inscríbete ¡ahora!</h3>
            <p className="font-body-md text-body-md text-surface-container-highest/90 text-sm">
              Apúntate a nuestro viaje y comienza a disfrutar de todas nuestras ventajas.
            </p>
            <button className="cursor-pointer mt-2 bg-primary-container text-on-primary-container hover:bg-primary-fixed hover:text-on-primary-fixed-variant transition-colors duration-200 font-label-md text-label-md font-bold py-2.5 px-6 rounded-full w-full shadow-sm">
              Inscribirse en viaje
            </button>
          </div>

          {/* Accommodations */}
          <div className="flex flex-col gap-3">
            <h3 className="font-headline-md text-body-lg font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
              <span className="material-symbols-outlined text-primary">hotel</span>
              Tu alojamiento
            </h3>
            {/* Hotel Card 1 */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="h-32 bg-surface-variant relative overflow-hidden">
                <img alt="Hotel Caribe" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="A bright, high-quality photograph of a modern hotel exterior or resort pool area with palm trees. Sunny daylight, light-mode aesthetic, corporate but welcoming travel vibe, clear blue sky. Focus on cleanliness and premium feel." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLS-nhTn3AMPG-Wa56cHqxbYr1VZBxHZ_5K9Png8IYnb5_EbjHhzWC5n4MbVLpZ2fWWNCNckFuo2WZJta2nREChksSInd_u5k2IrDgDyZafdp0HZPJZ631DHxld6tWXl08A64HJ7QF7lHbyrKU9uZTcXiv3bbuWeyAYG9JVq-VvojnXeoTRO3TDFHHf-4RXWhmR-9xrU0kRDnki201B-jD5GmiIDBH8KBHfv-ckiHVupJpnRSZAW6_7OMDa0_9HcZljGjLYhDRu0o" />
              </div>
              <div className="p-4">
                <h4 className="font-headline-md text-body-lg font-semibold text-on-surface">Hotel Caribe Resort</h4>
                <p className="font-caption text-caption text-on-surface-variant flex items-center gap-1 mt-1 mb-3">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  Port Aventura / 4 Estrellas
                </p>
                <button className="w-full py-2 border border-primary text-primary hover:bg-primary-container/10 font-label-md text-label-md rounded-lg transition-colors flex items-center justify-center gap-2">
                  Ver más
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                </button>
              </div>
            </div>
            {/* Hotel Card 2 */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="h-32 bg-surface-variant relative overflow-hidden">
                <img alt="Hotel El Paso" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="A clean, modern hotel room interior with neatly made beds, bright natural light coming through a window. Light-mode aesthetic, inviting, professional and safe atmosphere typical of a good school trip accommodation. Soft whites and blue accents." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC26Sm0oF02Qq8RzknFbr8nraMDxXmFc1GsejDa-3eSFYwuANbqSGOLgk6jq_3c3nVXeGDPwozZ3PoNIj_3WGNgmFBsb_TGbnwmp7IFdtjGTOx0ysVzlH_ccadFgroZDt6Aa5BMvPUIvI0Dal24Y0FFk1L9Zbr4W9a0r2lx3lCc_2cV1u7b84mU7Kd4LHDIcv6sr3rYdSOpMnP_pji0fZcaH3onHkuFNDZqkr-q1J3MphKzHz19PFGejH-GtoaxkHGhQicMlVdSQH8" />
              </div>
              <div className="p-4">
                <h4 className="font-headline-md text-body-lg font-semibold text-on-surface">Hotel El Paso</h4>
                <p className="font-caption text-caption text-on-surface-variant flex items-center gap-1 mt-1 mb-3">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  Port Aventura / 4 Estrellas
                </p>
                <button className="w-full py-2 border border-primary text-primary hover:bg-primary-container/10 font-label-md text-label-md rounded-lg transition-colors flex items-center justify-center gap-2">
                  Ver más
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                </button>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="flex flex-col gap-3">
            <h3 className="font-headline-md text-body-lg font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
              Beneficios
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 flex flex-col items-center text-center gap-2 hover:bg-surface-container-high transition-colors">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-[20px]">security</span>
                </div>
                <span className="font-caption text-[11px] font-semibold text-on-surface leading-tight">Seguridad 24h</span>
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 flex flex-col items-center text-center gap-2 hover:bg-surface-container-high transition-colors">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-[20px]">explore</span>
                </div>
                <span className="font-caption text-[11px] font-semibold text-on-surface leading-tight">Guía local</span>
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 flex flex-col items-center text-center gap-2 hover:bg-surface-container-high transition-colors">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-[20px]">restaurant</span>
                </div>
                <span className="font-caption text-[11px] font-semibold text-on-surface leading-tight">Todo incluido</span>
              </div>
            </div>
          </div>

          {/* Useful Links */}
          <div className="flex flex-col gap-3">
            <h3 className="font-headline-md text-body-lg font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
              <span className="material-symbols-outlined text-primary">menu_book</span>
              Te interesa
            </h3>
            <div className="flex flex-col gap-2">
              <a className="bg-surface-container-lowest border border-outline-variant p-3 rounded-lg flex justify-between items-center hover:bg-surface-bright transition-colors group shadow-sm" href="#">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Barcelona: Clima actual</span>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
              </a>
              <a className="bg-surface-container-lowest border border-outline-variant p-3 rounded-lg flex justify-between items-center hover:bg-surface-bright transition-colors group shadow-sm" href="#">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Preguntas Frecuentes</span>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
              </a>
              <a className="bg-surface-container-lowest border border-outline-variant p-3 rounded-lg flex justify-between items-center hover:bg-surface-bright transition-colors group shadow-sm" href="#">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Consejos: Seguro de viaje</span>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
              </a>
            </div>
          </div>

          {/* Info Summary Card */}
          <div className="bg-surface-container-highest border border-outline-variant rounded-xl p-5 shadow-sm text-sm text-on-surface-variant">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container">info</span>
              </div>
              <h4 className="font-headline-md text-body-lg font-bold text-on-surface">A tener en cuenta</h4>
            </div>
            <p className="mb-3">Se establecerá un plan de tres pagos básicos del viaje. Siendo el primer pago su reserva de plaza.</p>
            <p className="">Un paso intermedio para usuarios en listas para inscribirse de inmediato.</p>
          </div>
        </aside>
      </main>

      {/* Contact CTA Section */}
      <div className="w-full bg-surface-container-high border-t border-outline-variant">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface">¿Tienes dudas?</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Estamos aquí para ayudarte en cada paso.</p>
          </div>
          <a className="flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#128C7E] transition-colors py-3 px-8 rounded-full font-label-md text-label-md font-bold shadow-md w-full sm:w-auto" href="#">
            <span className="material-symbols-outlined">chat</span>
            Habla con nosotros por WhatsApp
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-inverse-surface dark:bg-surface-container-lowest w-full py-stack-lg px-margin-desktop flex flex-col md:flex-row justify-between items-center border-t border-outline-variant flat mt-auto">
        <div className="text-body-lg font-headline-md text-surface-container-lowest mb-4 md:mb-0">
          EduTrip
        </div>
        <div className="flex flex-wrap justify-center gap-6 mb-4 md:mb-0">
          <a className="font-caption text-caption text-tertiary-fixed-dim hover:text-primary-fixed transition-colors" href="#">Privacidad</a>
          <a className="font-caption text-caption text-tertiary-fixed-dim hover:text-primary-fixed transition-colors" href="#">Seguro de Viaje</a>
          <a className="font-caption text-caption text-tertiary-fixed-dim hover:text-primary-fixed transition-colors" href="#">Términos</a>
          <a className="font-caption text-caption text-tertiary-fixed-dim hover:text-primary-fixed transition-colors" href="#">Contacto</a>
        </div>
        <div className="font-caption text-caption text-primary-fixed-dim text-center md:text-right">
          © 2024 EduTrip School Travel. Todos los derechos reservados.
        </div>
      </footer>
    </>
  );
}
