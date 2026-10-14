/**
 * Composio Search responses recorded on 2026-10-14 (ticket 01), trimmed to a
 * few results with images, logos and long tokens cut, and a fake search port
 * serving them, for tests.
 */

import type { SearchPort, SearchSlug } from "./port"

/** Recorded from COMPOSIO_SEARCH_WEB, query "horario Museo del Prado octubre 2026". */
export const WEB = {
  answer:
    "El Museo del Prado abre de lunes a sábado de 10:00 a 20:00 y los domingos y festivos de 10:00 a 19:00 [1][2][3]. El desalojo de las salas comienza 10 minutos antes del cierre [2].\n\nPara octubre de 2026, tenga en cuenta dos excepciones:\nEl 12 de octubre, al ser festivo, el museo operó en horario de 10:00 a 19:00 [4][5].\nLa apertura nocturna gratuita, que ocurre el primer sábado de cada mes de 20:30 a 23:30, tuvo lugar el 3 de octubre [6][7].",
  citations: [
    {
      id: "https://museodelprado.es/visita/horarios-y-tarifas",
      title: "Horarios y precios - Museo Nacional del Prado",
      url: "https://museodelprado.es/visita/horarios-y-tarifas",
    },
    {
      id: "https://www.museodelprado.es/museo/carta-de-servicios",
      title: "Carta de servicios - Museo Nacional del Prado",
      url: "https://www.museodelprado.es/museo/carta-de-servicios",
    },
    {
      id: "https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/Retiro/Publicaciones-y-convocatorias/Museo-del-Prado/?vgnextchannel=3176d47ffee28010VgnVCM100000dc0ca8c0RCRD&vgnextfmt=default&vgnextoid=060079262ef5d010VgnVCM1000000b205a0aRCRD",
      title: "Museo del Prado - Ayuntamiento de Madrid",
      url: "https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/Retiro/Publicaciones-y-convocatorias/Museo-del-Prado/?vgnextchannel=3176d47ffee28010VgnVCM100000dc0ca8c0RCRD&vgnextfmt=default&vgnextoid=060079262ef5d010VgnVCM1000000b205a0aRCRD",
    },
  ],
}

/** Recorded from COMPOSIO_SEARCH_FETCH_URL_CONTENT, the Prado's "Horarios y precios" page; text cut short. */
export const PAGE = {
  composio_execution_message: null,
  requestId: "cfa7e2e61ac22a0e3bb9d3dd5193eae1",
  results: [
    {
      author: null,
      id: "https://museodelprado.es/visita/horarios-y-tarifas",
      text: "Horarios y precios - Museo Nacional del Prado formularioRDF\n\nEl recorrido TITULORECORRIDO se ha creado correctamente. Añade obras desde la página de Colección\n\nAñadido TITULOOBRA en el recorrido TITULORECORRIDO \n\n# Horarios y precios\n\n## Horarios\n\n- Lunes a sábado: de 10:00 a 20:00 h\n- Domingos y festivos: de 10:00 a 19:00 h\n- Cerrado: 1 enero, 1 mayo, 25 diciembre\n- Horario reducido (10-14 h): 6 enero, 24 y 31 diciembre\n\nAcceso al Museo hasta 30 min. antes del cierre. El desalojo de las salas se inicia 10 min. antes del cierre.\n\nLa entrada del Museo incluye la visita a la Colección y a las exposiciones temporales.\n\nEl acceso se realiza con pase horario, seleccione la fecha y hora al adquirir su entrada.\n\nLas entradas gratuitas y reducidas requieren acreditación con el documento oficial correspondiente, válido y actualizado, en taquilla el día de la visita.\n\n## Tipos de entrada\n\nEntrada general\n\n15 €\n\nEntrada + Audioguía\n\nEntrada + 5 €\n\nHorario de gratuidad\n\nDos últimas horas antes del cierre\n\nAcceso gratuito a la Colección\n\nEntradas disponibles en taquilla hasta completar aforo\n\nReducción del 50% en el precio de la entrada a las exposiciones temporales\n\nEntrada reducida\n\n7,50 €\n\nP",
      title: "Horarios y precios - Museo Nacional del Prado",
      url: "https://museodelprado.es/visita/horarios-y-tarifas",
    },
  ],
  statuses: [
    {
      id: "https://museodelprado.es/visita/horarios-y-tarifas",
      source: "cached",
      status: "success",
    },
  ],
}

/** Recorded from COMPOSIO_SEARCH_FETCH_URL_CONTENT for a page Exa couldn't crawl: still `successful: true`. */
export const PAGE_FAILED = {
  composio_execution_message:
    "All 1 URL(s) failed to fetch. Errors: CRAWL_UNKNOWN_ERROR. Check 'statuses' field for details. Note: This API only supports web pages (HTML content), not direct links to images, PDFs, or other binary files.",
  requestId: "7e7fa637b56fe0df1d1347ac6bdd2b87",
  results: [],
  statuses: [
    {
      error: {
        httpStatusCode: 500,
        tag: "CRAWL_UNKNOWN_ERROR",
      },
      id: "https://www.museodelprado.es/visita-museo",
      status: "error",
    },
  ],
}

/** Recorded from COMPOSIO_SEARCH_NEWS, query "Real Madrid", hl=es, gl=es. */
export const NEWS = {
  has_results: true,
  news_results: [
    {
      date: "hace 16 horas",
      link: "https://www.marca.com/futbol/real-madrid/2026/10/13/paso-primer-minuto-referencia-mourinho.html",
      published_at: "2026-10-13 16:54:39 UTC",
      snippet:
        "El técnico esquivó cinco preguntas sobre la polémica con el Villarreal... e invitó a la prensa a buscar lo ocurrido en el primer minuto del...",
      source: "MARCA",
      title: "¿Qué pasó en el primer minuto al que hace referencia Mourinho?",
    },
    {
      date: "hace 14 horas",
      link: "https://www.mundodeportivo.com/futbol/real-madrid/20261013/1004238358/paso-primer-minuto-real-madrid-villarreal.html",
      published_at: "2026-10-13 18:32:17 UTC",
      snippet:
        "Jose Mourinho no quiso hablar de su plante a los medios tras el partido ante el Villarreal. Tampoco de su enfado con la labor de Díaz de...",
      source: "Mundo Deportivo",
      title: "¿Qué pasó en el primer minuto del Real Madrid-Villarreal?",
    },
    {
      date: "hace 1 hora",
      link: "https://okdiario.com/diariomadridista/fichajes/xabi-alonso-puede-robarle-nueva-joya-inglaterra-real-madrid-667943",
      published_at: "2026-10-14 07:33:22 UTC",
      snippet:
        "El Chelsea de Xabi Alonso lidera la carrera para fichar a Alex Scott, al que sigue el Real Madrid. Esto debes saber sobre Alex Scott.",
      source: "OkDiario",
      title:
        "Xabi Alonso puede ‘robarle’ la nueva joya de Inglaterra al Real Madrid",
    },
  ],
  no_results_message: null,
  query: "Real Madrid",
  total_results: 15100000,
}

/** Recorded from COMPOSIO_SEARCH_FLIGHTS, MAD → FCO one way on 2026-10-16, EUR, hl=es, gl=es. */
export const FLIGHTS = {
  results: {
    airports: [
      {
        departure: [
          {
            airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
            },
            city: "Madrid",
            country: "España",
            country_code: "ES",
          },
        ],
        arrival: [
          {
            airport: {
              id: "FCO",
              name: "Aeropuerto de Roma-Fiumicino",
            },
            city: "Roma",
            country: "Italia",
            country_code: "IT",
          },
        ],
      },
    ],
    best_flights: [
      {
        booking_token: "WyJDalJJVkUxdlpVTmtVVGxM…",
        carbon_emissions: {
          difference_percent: -26,
          this_flight: 96000,
          typical_for_this_route: 129000,
        },
        flights: [
          {
            airline: "Wizz Air",
            airplane: "Airbus A321neo",
            arrival_airport: {
              id: "FCO",
              name: "Aeropuerto de Roma-Fiumicino",
              time: "2026-10-17 01:25",
            },
            departure_airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
              time: "2026-10-16 22:55",
            },
            duration: 150,
            extensions: ["Carbon emissions estimate: 95 kg"],
            flight_number: "W4 6016",
            often_delayed_by_over_30_min: true,
            travel_class: "Economy",
          },
        ],
        price: 60,
        total_duration: 150,
        type: "One way",
      },
      {
        booking_token: "WyJDalJJVkUxdlpVTmtVVGxM…",
        carbon_emissions: {
          difference_percent: -7,
          this_flight: 120000,
          typical_for_this_route: 129000,
        },
        flights: [
          {
            airline: "Ryanair",
            airplane: "Boeing 737",
            arrival_airport: {
              id: "FCO",
              name: "Aeropuerto de Roma-Fiumicino",
              time: "2026-10-17 01:10",
            },
            departure_airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
              time: "2026-10-16 22:45",
            },
            duration: 145,
            extensions: [
              "Average legroom (76 cm)",
              "Carbon emissions estimate: 120 kg",
            ],
            flight_number: "FR 2436",
            legroom: "76 cm",
            often_delayed_by_over_30_min: true,
            plane_and_crew_by: "Malta Air",
            travel_class: "Economy",
          },
        ],
        price: 85,
        total_duration: 145,
        type: "One way",
      },
    ],
    other_flights: [
      {
        booking_token: "WyJDalJJVkUxdlpVTmtVVGxM…",
        carbon_emissions: {
          difference_percent: -21,
          this_flight: 102000,
          typical_for_this_route: 129000,
        },
        flights: [
          {
            airline: "Ryanair",
            airplane: "Boeing 737MAX 8 Passenger",
            arrival_airport: {
              id: "FCO",
              name: "Aeropuerto de Roma-Fiumicino",
              time: "2026-10-16 08:20",
            },
            departure_airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
              time: "2026-10-16 05:55",
            },
            duration: 145,
            extensions: [
              "Below average legroom (71 cm)",
              "Carbon emissions estimate: 101 kg",
            ],
            flight_number: "FR 9674",
            legroom: "71 cm",
            often_delayed_by_over_30_min: true,
            travel_class: "Economy",
          },
        ],
        price: 104,
        total_duration: 145,
        type: "One way",
      },
      {
        booking_token: "WyJDalJJVkUxdlpVTmtVVGxM…",
        carbon_emissions: {
          difference_percent: -16,
          this_flight: 108000,
          typical_for_this_route: 129000,
        },
        flights: [
          {
            airline: "ITA",
            airplane: "Airbus A320neo",
            arrival_airport: {
              id: "FCO",
              name: "Aeropuerto de Roma-Fiumicino",
              time: "2026-10-16 08:20",
            },
            departure_airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
              time: "2026-10-16 05:55",
            },
            duration: 145,
            extensions: [
              "Below average legroom (74 cm)",
              "Wi-Fi for a fee",
              "In-seat USB outlet",
              "Stream media to your device",
              "Carbon emissions estimate: 107 kg",
            ],
            flight_number: "AZ 59",
            legroom: "74 cm",
            travel_class: "Economy",
          },
        ],
        price: 151,
        total_duration: 145,
        type: "One way",
      },
    ],
    search_metadata: {
      status: "Success",
      google_flights_url:
        "https://www.google.com/travel/flights?hl=es&gl=es&curr=EUR&tfs=CBwQAhoeEgoyMDI2LTEwLTE2agcIARIDTUFEcgcIARIDRkNPQAFIAXABmAEC&tfu=EgIIAQ",
    },
    search_parameters: {
      adults: 1,
      arrival_id: "FCO",
      children: 0,
      currency: "EUR",
      departure_id: "MAD",
      engine: "google_flights",
      gl: "es",
      hl: "es",
      outbound_date: "2026-10-16",
      type: 2,
    },
  },
}

/** Recorded from COMPOSIO_SEARCH_FLIGHTS, MAD → HND one way on 2026-11-10, EUR: one flight with a layover. */
export const FLIGHTS_WITH_LAYOVER = {
  results: {
    airports: [
      {
        departure: [
          {
            airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
            },
            city: "Madrid",
            country: "España",
            country_code: "ES",
          },
        ],
        arrival: [
          {
            airport: {
              id: "HND",
              name: "Aeropuerto Internacional de Tokio",
            },
            city: "Tokio",
            country: "Japón",
            country_code: "JP",
          },
        ],
      },
    ],
    best_flights: [
      {
        booking_token: "WyJDalJJTVdaclZETlhORU5s…",
        carbon_emissions: {
          difference_percent: 3,
          this_flight: 751000,
          typical_for_this_route: 730000,
        },
        flights: [
          {
            airline: "China Eastern",
            airplane: "Airbus A350",
            arrival_airport: {
              id: "PVG",
              name: "Aeropuerto Internacional Pudong",
              time: "2026-11-11 06:20",
            },
            departure_airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
              time: "2026-11-10 10:30",
            },
            duration: 770,
            extensions: [
              "Average legroom (79 cm)",
              "Free Wi-Fi",
              "In-seat USB outlet",
              "On-demand video",
              "Carbon emissions estimate: 577 kg",
            ],
            flight_number: "MU 710",
            legroom: "79 cm",
            overnight: true,
            travel_class: "Economy",
          },
          {
            airline: "China Eastern",
            airplane: "Airbus A330",
            arrival_airport: {
              id: "HND",
              name: "Aeropuerto Internacional de Tokio",
              time: "2026-11-11 18:30",
            },
            departure_airport: {
              id: "PVG",
              name: "Aeropuerto Internacional Pudong",
              time: "2026-11-11 14:55",
            },
            duration: 155,
            extensions: [
              "Average legroom (79 cm)",
              "Free Wi-Fi",
              "In-seat power & USB outlets",
              "On-demand video",
              "Carbon emissions estimate: 173 kg",
            ],
            flight_number: "MU 539",
            legroom: "79 cm",
            travel_class: "Economy",
          },
        ],
        layovers: [
          {
            duration: 515,
            id: "PVG",
            name: "Aeropuerto Internacional Pudong",
          },
        ],
        price: 447,
        total_duration: 1440,
        type: "One way",
      },
    ],
    other_flights: [],
    search_metadata: {
      status: "Success",
      google_flights_url:
        "https://www.google.com/travel/flights?hl=es&gl=es&curr=EUR&tfs=CBwQAhoeEgoyMDI2LTExLTEwagcIARIDTUFEcgcIARIDSE5EQAFIAXABmAEC&tfu=EgIIAQ",
    },
    search_parameters: {
      adults: 1,
      arrival_id: "HND",
      children: 0,
      currency: "EUR",
      departure_id: "MAD",
      engine: "google_flights",
      gl: "es",
      hl: "es",
      outbound_date: "2026-11-10",
      type: 2,
    },
  },
}

/** Recorded from COMPOSIO_SEARCH_FLIGHTS, MAD ⇄ LIS 2026-11-03 to 2026-11-07, two adults, EUR: outbound legs only. */
export const FLIGHTS_ROUND_TRIP = {
  results: {
    airports: [
      {
        departure: [
          {
            airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
            },
            city: "Madrid",
            country: "España",
            country_code: "ES",
          },
        ],
        arrival: [
          {
            airport: {
              id: "LIS",
              name: "Aeropuerto de Lisboa",
            },
            city: "Lisboa",
            country: "Portugal",
            country_code: "PT",
          },
        ],
      },
      {
        departure: [
          {
            airport: {
              id: "LIS",
              name: "Aeropuerto de Lisboa",
            },
            city: "Lisboa",
            country: "Portugal",
            country_code: "PT",
          },
        ],
        arrival: [
          {
            airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
            },
            city: "Madrid",
            country: "España",
            country_code: "ES",
          },
        ],
      },
    ],
    best_flights: [
      {
        carbon_emissions: {
          difference_percent: -3,
          this_flight: 132000,
          typical_for_this_route: 136000,
        },
        departure_token: "WyJDalJJVjAwNFMxRXlTa0pq…",
        flights: [
          {
            airline: "easyJet",
            airplane: "Airbus A320",
            arrival_airport: {
              id: "LIS",
              name: "Aeropuerto de Lisboa",
              time: "2026-11-03 10:30",
            },
            departure_airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
              time: "2026-11-03 10:05",
            },
            duration: 85,
            extensions: ["Carbon emissions estimate: 131 kg"],
            flight_number: "U2 7640",
            travel_class: "Economy",
          },
        ],
        price: 172,
        total_duration: 85,
        type: "Round trip",
      },
      {
        carbon_emissions: {
          difference_percent: -12,
          this_flight: 120000,
          typical_for_this_route: 136000,
        },
        departure_token: "WyJDalJJVjAwNFMxRXlTa0pq…",
        flights: [
          {
            airline: "Air Europa",
            airplane: "Boeing 737",
            arrival_airport: {
              id: "LIS",
              name: "Aeropuerto de Lisboa",
              time: "2026-11-03 06:50",
            },
            departure_airport: {
              id: "MAD",
              name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
              time: "2026-11-03 06:30",
            },
            duration: 80,
            extensions: [
              "Below average legroom (74 cm)",
              "Carbon emissions estimate: 120 kg",
            ],
            flight_number: "UX 1159",
            legroom: "74 cm",
            travel_class: "Economy",
          },
        ],
        price: 222,
        total_duration: 80,
        type: "Round trip",
      },
    ],
    other_flights: [],
    search_metadata: {
      status: "Success",
      google_flights_url:
        "https://www.google.com/travel/flights?hl=es&gl=es&curr=EUR&tfs=CBwQAhoeEgoyMDI2LTExLTAzagcIARIDTUFEcgcIARIDTElTGh4SCjIwMjYtMTEtMDdqBwgBEgNMSVNyBwgBEgNNQURAAUABSAFwAZgBAQ&tfu=EgIIAQ",
    },
    search_parameters: {
      adults: 2,
      arrival_id: "LIS",
      children: 0,
      currency: "EUR",
      departure_id: "MAD",
      engine: "google_flights",
      gl: "es",
      hl: "es",
      outbound_date: "2026-11-03",
      return_date: "2026-11-07",
      type: 1,
    },
  },
}

/** Recorded from COMPOSIO_SEARCH_HOTELS, q "Lisboa", 2026-11-03 to 2026-11-07, two adults, EUR, hl=es, gl=es. */
export const HOTELS = {
  results: {
    properties: [
      {
        address: "Avenida 5 de Outubro 197",
        check_in_time: "14:00",
        check_out_time: "12:00",
        description:
          "Hotel moderno con habitaciones y suites elegantes, spa, piscina de temporada y bar moderno.",
        eco_certified: true,
        extracted_hotel_class: 5,
        gps_coordinates: {
          latitude: 38.742240599999995,
          longitude: -9.1491891,
        },
        hotel_class: "Hotel de 5 estrellas",
        link: "https://www.viphotels.com/en/hotels/vip-grand-lisboa-in-lisbon/?partner=8189utm_source=google&utm_medium=organic&utm_campaign=MyBusiness&utm",
        location_rating: 3.7,
        name: "VIP Grand Lisboa Hotel & Spa",
        overall_rating: 4,
        phone: "+351 21 043 5000",
        phone_link: "tel:+351210435000",
        property_token: "ChcI7dSfsOWM-IojGgsvZy8xdGdkN3QzeRAB",
        rate_per_night: {
          before_taxes_fees: "EUR 85",
          extracted_before_taxes_fees: 85,
          extracted_lowest: 98,
          lowest: "EUR 98",
        },
        reviews: 3102,
        total_rate: {
          before_taxes_fees: "EUR 342",
          extracted_before_taxes_fees: 342,
          extracted_lowest: 394,
          lowest: "EUR 394",
        },
        type: "hotel",
      },
      {
        address: "R. da Palma 284",
        check_in_time: "16:00",
        check_out_time: "12:00",
        extracted_hotel_class: 2,
        gps_coordinates: {
          latitude: 38.7194001,
          longitude: -9.135489,
        },
        hotel_class: "Hotel de 2 estrellas",
        link: "http://www.lisbon5hotel.com/",
        location_rating: 4.1,
        name: "Lisbon 5",
        overall_rating: 3.9,
        phone: "+351 925 771 111",
        phone_link: "tel:+351925771111",
        property_token: "ChoIrIbgk9DRgsSpARoNL2cvMTFqMXozX25xORAB",
        rate_per_night: {
          before_taxes_fees: "EUR 70",
          extracted_before_taxes_fees: 70,
          extracted_lowest: 74,
          lowest: "EUR 74",
        },
        reviews: 756,
        total_rate: {
          before_taxes_fees: "EUR 280",
          extracted_before_taxes_fees: 280,
          extracted_lowest: 296,
          lowest: "EUR 296",
        },
        type: "hotel",
      },
      {
        address: "R. dos Fanqueiros 300",
        check_in_time: "14:00",
        check_out_time: "11:00",
        description:
          "Hostal informal con dormitorios sencillos, habitaciones privadas y café/bar colorido.",
        extracted_hotel_class: 2,
        gps_coordinates: {
          latitude: 38.7130977,
          longitude: -9.136828999999999,
        },
        hotel_class: "Hotel de 2 estrellas",
        link: "https://www.thecentralhousegroup.com/",
        location_rating: 4.8,
        name: "The Central House Lisbon Baixa",
        overall_rating: 4.3,
        phone: "+351 21 887 3552",
        phone_link: "tel:+351218873552",
        property_token: "ChkIg-b2ismUj7M1Gg0vZy8xMWg3MThreGg1EAE",
        rate_per_night: {
          before_taxes_fees: "EUR 42",
          extracted_before_taxes_fees: 42,
          extracted_lowest: 53,
          lowest: "EUR 53",
        },
        reviews: 747,
        total_rate: {
          before_taxes_fees: "EUR 169",
          extracted_before_taxes_fees: 169,
          extracted_lowest: 211,
          lowest: "EUR 211",
        },
        type: "hotel",
      },
    ],
    search_information: {
      total_results: 1794,
    },
    search_parameters: {
      adults: 2,
      check_in_date: "2026-11-03",
      check_out_date: "2026-11-07",
      children: 0,
      currency: "EUR",
      engine: "google_hotels",
      gl: "es",
      hl: "es",
      q: "Lisboa",
    },
  },
}

/** Recorded from COMPOSIO_SEARCH_GOOGLE_MAPS, q "restaurantes japoneses cerca de Sol, Madrid" (no hl/gl input). */
export const PLACES = {
  results: {
    local_results: [
      {
        address: "C. de Preciados, 34, Centro, 28013 Madrid, Spain",
        country: "Spain",
        data_cid: "6060678205522102192",
        data_id: "0xd4229c8f16c5a21:0x541bdab79218c7b0",
        gps_coordinates: {
          latitude: 40.4197437,
          longitude: -3.7066407999999997,
        },
        hours: "Closed · Opens 12:30 PM",
        open_state: "Closed · Opens 12:30 PM",
        phone: "+34 915 75 37 12",
        place_id: "ChIJIVps8cgpQg0RsMcYkrfaG1Q",
        position: 1,
        provider_id: "/g/11jzs4jqnb",
        rating: 4.6,
        reviews: 1644,
        title: "居酒屋-Konnichiwa de Preciados | Restaurante Japonés Madrid",
        type: "Japanese restaurant",
        types: [
          "Japanese restaurant",
          "Donburi restaurant",
          "Izakaya restaurant",
          "Okonomiyaki restaurant",
          "Ramen restaurant",
          "Sushi restaurant",
        ],
        website:
          "http://www.konnichiwa.es/?utm_source=gmb&utm_medium=organic&utm_campaign=gmb_website",
      },
      {
        address: "C. de las Conchas, 4, Centro, 28013 Madrid, Spain",
        country: "Spain",
        data_cid: "5392908745927739239",
        data_id: "0xd42287c0b0326cb:0x4ad775ee7b1ec767",
        description:
          "Japanese set lunches, sushi & gyoza. Long-established venue with a simple interior for sushi, gyoza, noodles & set Japanese lunch menus.",
        gps_coordinates: {
          latitude: 40.4190371,
          longitude: -3.7076721999999998,
        },
        hours: "Closed · Opens 1 PM",
        open_state: "Closed · Opens 1 PM",
        phone: "+34 915 59 29 39",
        place_id: "ChIJyyYDC3woQg0RZ8cee-5110o",
        position: 2,
        provider_id: "/g/1thd7zzr",
        rating: 4.5,
        reviews: 2630,
        title: "MUSASHI",
        type: "Japanese restaurant",
        types: ["Japanese restaurant"],
        website: "http://www.musashimadrid.es/",
      },
      {
        address: "Calle de Echegaray, 3, Centro, 28014 Madrid, Spain",
        country: "Spain",
        data_cid: "13561353318772354804",
        data_id: "0xd422881104ee007:0xbc339afe06fdaef4",
        description:
          "Chic space for classic Japanese cuisine. Japanese standards like sushi, bento boxes & shabu-shabu hotpot in stylish, dark wood interiors.",
        gps_coordinates: {
          latitude: 40.4161876,
          longitude: -3.6995698999999997,
        },
        hours: "Closed · Opens 1 PM",
        open_state: "Closed · Opens 1 PM",
        phone: "+34 914 29 57 20",
        place_id: "ChIJB-BOEIEoQg0R9K79Bv6aM7w",
        position: 3,
        provider_id: "/g/1tt1jj9_",
        rating: 4.6,
        reviews: 3068,
        title: "Donzoko",
        type: "Authentic Japanese restaurant",
        types: ["Authentic Japanese restaurant"],
        website: "https://donzoko.es/",
      },
    ],
    search_information: {
      local_results_state: "Results for exact spelling",
      query_displayed: "restaurantes japoneses cerca de Sol, Madrid",
    },
    search_parameters: {
      engine: "google_maps",
      google_domain: "google.com",
      hl: "en",
      q: "restaurantes japoneses cerca de Sol, Madrid",
      type: "search",
    },
  },
}

/** Recorded from COMPOSIO_SEARCH_EVENT, query "conciertos", location "Madrid", hl=es, gl=es. */
export const EVENTS = {
  results: {
    events_results: [
      {
        address: ["FLAMENCO Las Tablas", "Madrid, Spain"],
        date: {
          start_date: "Oct 14",
          when: "Oct 14, 9:30 PM",
        },
        title: "Espectáculo de Flamenco en directo en Madrid",
        venue: {
          name: "FLAMENCO Las Tablas",
        },
      },
      {
        address: ["Teatro Monumental", "Madrid, Spain"],
        date: {
          start_date: "Oct 16",
          when: "Oct 16, 7:30 PM",
        },
        title: "Concierto sinfónica B/2 Viernes",
        venue: {
          name: "Teatro Monumental",
        },
      },
      {
        address: [
          "Royal Congregation of San Isidro of Madrid",
          "Madrid, Spain",
        ],
        date: {
          start_date: "Oct 29",
          when: "Oct 29, 5:00 PM",
        },
        title: "Classical Concert in the Heart of Madrid – San Isidor’s Church",
        venue: {
          name: "Royal Congregation of San Isidro of Madrid",
        },
      },
    ],
    search_information: {
      events_results_state: "Results for exact spelling",
    },
    search_parameters: {
      engine: "google_events",
      location_requested: "Madrid",
      location_used: "Community of Madrid,Spain",
      q: "conciertos",
    },
  },
}

/** The recorded response for each Search tool, as the fake port serves it. */
const RECORDED: Record<SearchSlug, unknown> = {
  COMPOSIO_SEARCH_WEB: WEB,
  COMPOSIO_SEARCH_FETCH_URL_CONTENT: PAGE,
  COMPOSIO_SEARCH_NEWS: NEWS,
  COMPOSIO_SEARCH_FLIGHTS: FLIGHTS,
  COMPOSIO_SEARCH_HOTELS: HOTELS,
  COMPOSIO_SEARCH_GOOGLE_MAPS: PLACES,
  COMPOSIO_SEARCH_EVENT: EVENTS,
}

/**
 * Composio Search serving the recorded responses, recording every call. A
 * route gives another response for a slug, or an error to throw.
 */
export function fakeSearch(
  routes: Partial<Record<SearchSlug, { data?: unknown; error?: Error }>> = {}
) {
  const calls: { slug: SearchSlug; args: Record<string, unknown> }[] = []
  const search: SearchPort = {
    async run(slug, args) {
      calls.push({ slug, args })
      const route = routes[slug]
      if (route?.error) throw route.error
      return route && "data" in route ? route.data : RECORDED[slug]
    },
  }
  return { search, calls }
}
