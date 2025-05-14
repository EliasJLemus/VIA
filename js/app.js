import TravelRecommender from "./model.js";

// Variable para rastrear si los event listeners ya están configurados
let listenersInitialized = false;
let recommender = null;
const ACCESS_KEY = "2cmDGYcpKM2Hexq8AZjD2GE34qKwY_l96jxElLXbUEw";

async function initializeRecommender() {
  if (recommender !== null) {
    console.log(
      "El recomendador ya está inicializado, omitiendo la inicialización."
    );
    return;
  }

  try {
    console.log("Iniciando carga de datos...");
    const response = await fetch("js/data.json");
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo de datos.");
    }
    const data = await response.json();
    console.log("Datos cargados exitosamente.");

    const centroids = [
      [4.5, 200, 1, 0, 1, 0, 0, 0, 0],
      [4.2, 150, 0, 1, 1, 1, 0, 0, 0],
      [4.8, 300, 1, 1, 1, 0, 0, 1, 0],
      [4.0, 175, 0, 0, 1, 1, 1, 0, 0],
      [4.6, 250, 1, 1, 0, 0, 0, 0, 1],
      [4.3, 225, 0, 1, 1, 0, 0, 1, 0],
      [4.7, 275, 1, 0, 1, 1, 0, 0, 0],
      [4.4, 190, 0, 1, 0, 0, 1, 1, 0],
    ];

    recommender = new TravelRecommender(data, centroids);
    console.log("Recomendador inicializado correctamente.");

    if (!listenersInitialized) {
      setupEventListeners();
      listenersInitialized = true;
    }
  } catch (error) {
    console.error("Error al inicializar el recomendador:", error);
  }
}

function getStars(rating) {
  const fullStar = "★";
  const emptyStar = "☆";
  const total = 5;
  const filled = Math.round(rating);
  return Array(filled)
    .fill(fullStar)
    .concat(Array(total - filled).fill(emptyStar))
    .join("");
}

async function buscarImagenes(lugar) {
  if (lugar.image_url && lugar.image_url !== "No disponible") {
    try {
      const cleanUrl = decodeURIComponent(lugar.image_url.replace(/\\/g, ""));
      return cleanUrl;
    } catch (error) {
      console.warn(`Error con imagen original:`, error);
    }
  }

  try {
    const query = lugar.nombre;
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=1&client_id=${ACCESS_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
    }
  } catch (error) {
    console.error("Error con Unsplash:", error);
  }

  return "/img/placeholder.jpg";
}

// Variable para controlar múltiples envíos del formulario
let isProcessingRecommendations = false;

async function mostrarRecomendaciones(recomendaciones) {
  if (isProcessingRecommendations) {
    console.log(
      "Ya se está procesando una recomendación. Ignorando solicitud duplicada."
    );
    return;
  }

  isProcessingRecommendations = true;

  const container = document.getElementById("recomendaciones");
  // Limpiar el contenedor antes de añadir nuevas recomendaciones
  container.innerHTML = "";
  container.style.display = "grid";
  // Eliminar clases anteriores
  container.className = "recommendations-container";

  if (!recomendaciones || recomendaciones.length === 0) {
    container.classList.add("recommendations-1");
    container.innerHTML = `
            <div class="card-recomendacion no-results-card">
                <div class="card-recomendacion-content">
                    <div class="info-container">
                        <h3>Oh no, lo sentimos. No se encontraron destinos.</h3>
                        <p>Intenta ajustando los criterios de búsqueda.</p>
                    </div>
                </div>
            </div>
        `;
    container.classList.add("visible");
    isProcessingRecommendations = false;
    return;
  }

  // Añadir la clase según la cantidad de recomendaciones
  container.classList.add(`recommendations-${recomendaciones.length}`);

  // Usar Promise.all para esperar todas las búsquedas de imágenes en paralelo
  try {
    const cards = await Promise.all(
      recomendaciones.map(async (lugar) => {
        try {
          const imagen = await buscarImagenes(lugar);
          const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
            lugar.nombre
          )}`;
          const ciudadMostrar =
            document.getElementById("ciudad").options[
              document.getElementById("ciudad").selectedIndex
            ].text;

          return `
          <div class="card-recomendacion">
            <a href="${googleSearchUrl}" target="_blank" class="google-search-btn" title="Buscar en Google">
              <img src="img/icon_google.png" alt="Buscar en Google">
            </a>
            <img src="${imagen}" alt="${
            lugar.nombre
          }" onerror="this.src='/img/placeholder.jpg'">
            <div class="card-recomendacion-content">
              <div class="info-container">
                <h3 class="destination-title">${lugar.nombre}</h3>
                <div class="stars-container">
                  <div class="stars">${getStars(lugar.calificacion)}</div>
                  <span class="rating-value">(${lugar.calificacion.toFixed(
                    1
                  )})</span>
                </div>
                <div class="destination-meta">
                  ${ciudadMostrar} <span class="bullet-separator">•</span> 
                  ${lugar.tipoTurismo} <span class="bullet-separator">•</span> 
                  $${lugar.precio.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        `;
        } catch (error) {
          console.error(`Error al crear tarjeta para ${lugar.nombre}:`, error);
          return "";
        }
      })
    );

    // Añadir todas las cards al contenedor de una vez
    container.innerHTML = cards.join("");
  } catch (error) {
    console.error("Error al crear tarjetas:", error);
  }

  // Hacer visible el contenedor
  container.classList.add("visible");
  isProcessingRecommendations = false;
}

function setupEventListeners() {
  console.log("Configurando event listeners...");
  const regionSelect = document.getElementById("region");
  const paisSelect = document.getElementById("pais");
  const ciudadSelect = document.getElementById("ciudad");
  const form = document.getElementById("recommendationForm");

  // Limpiar listeners anteriores si existieran
  regionSelect.removeEventListener("change", handleRegionChange);
  paisSelect.removeEventListener("change", handlePaisChange);
  form.removeEventListener("submit", handleFormSubmit);

  // Añadir nuevos listeners
  regionSelect.addEventListener("change", handleRegionChange);
  paisSelect.addEventListener("change", handlePaisChange);
  form.addEventListener("submit", handleFormSubmit);

  // Configurar interacción táctil para las cards
  setupTouchInteractions();

  console.log("Event listeners configurados correctamente.");
}

// Funciones separadas para cada manejador de eventos
function handleRegionChange() {
  const selectedRegion = this.value;
  console.log("Región seleccionada:", selectedRegion);

  if (!recommender) {
    console.error("El recomendador no está inicializado");
    return;
  }

  const paises = recommender.getCountriesForRegion(selectedRegion);
  console.log("Países obtenidos:", paises);

  const paisSelect = document.getElementById("pais");
  const ciudadSelect = document.getElementById("ciudad");

  paisSelect.innerHTML = '<option value="">Selecciona un país</option>';
  paises.forEach((pais) => {
    const option = document.createElement("option");
    option.value = pais;
    option.textContent = pais;
    paisSelect.appendChild(option);
  });

  ciudadSelect.innerHTML =
    '<option value="">Primero selecciona un país</option>';
}

function handlePaisChange() {
  const selectedCountry = this.value;
  console.log("País seleccionado:", selectedCountry);

  if (!recommender) {
    console.error("El recomendador no está inicializado");
    return;
  }

  const ciudades = recommender.getCitiesForCountry(selectedCountry);
  console.log("Ciudades obtenidas:", ciudades);

  const ciudadSelect = document.getElementById("ciudad");
  ciudadSelect.innerHTML = '<option value="">Selecciona una ciudad</option>';
  ciudades.forEach((ciudad) => {
    const option = document.createElement("option");
    option.value = ciudad;
    option.textContent = ciudad;
    ciudadSelect.appendChild(option);
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (isProcessingRecommendations) {
    console.log("Ya se está procesando una solicitud. Por favor espera.");
    return;
  }

  const formData = new FormData(this);
  const datos = {
    region: formData.get("region"),
    pais: formData.get("pais"),
    ciudad: formData.get("ciudad"),
    tipoTurismo: formData.get("tipoTurismo"),
    presupuesto: parseFloat(formData.get("presupuesto")),
  };

  if (!recommender) {
    alert("El sistema está cargando. Por favor, espera un momento.");
    return;
  }

  const recomendaciones = recommender.recomendar(
    datos.region,
    datos.pais,
    datos.ciudad,
    datos.tipoTurismo,
    datos.presupuesto
  );

  await mostrarRecomendaciones(recomendaciones);
}

// Función para mejorar interacción táctil con las cards
function setupTouchInteractions() {
  document.addEventListener("DOMContentLoaded", () => {
    const addTouchClass = () => {
      if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add("touch-device");
      }
    };

    addTouchClass();

    // Delegación de eventos para manejar toques en cards
    document.addEventListener(
      "touchstart",
      function (e) {
        const card = e.target.closest(".card, .card-recomendacion");
        if (card) {
          // Eliminar clase active de todas las cards
          document
            .querySelectorAll(".card.active, .card-recomendacion.active")
            .forEach((el) => {
              if (el !== card) el.classList.remove("active");
            });

          // Toggle clase active en la card tocada
          card.classList.toggle("active");

          // Prevenir comportamiento hover fantasma
          e.preventDefault();
        }
      },
      { passive: false }
    );
  });
}

// Header scroll effect
let lastScroll = 0;
const header = document.querySelector(".header");
const logo = document.querySelector(".logo");

window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll > 50) {
    logo.classList.add("hidden");
  } else {
    logo.classList.remove("hidden");
  }
});

// Función para el efecto parallax en el hero
function setupParallaxEffect() {
  const hero = document.querySelector(".hero");

  if (window.innerWidth >= 1025) {
    hero.classList.add("parallax-effect");

    document.addEventListener("mousemove", function (e) {
      if (hero.classList.contains("parallax-effect")) {
        let mouseX = e.clientX / window.innerWidth;
        let mouseY = e.clientY / window.innerHeight;

        let moveX = 20 - mouseX * 40; // -20 a 20px de movimiento
        let moveY = 20 - mouseY * 40; // -20 a 20px de movimiento

        hero.style.backgroundPosition = `calc(50% + ${moveX}px) calc(50% + ${moveY}px)`;
      }
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado, inicializando recomendador...");
  initializeRecommender();
  setupParallaxEffect(); // Añadimos el setup del efecto parallax
});

// Reiniciar estado si la página se recarga o vuelve a la navegación
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    console.log("Página restaurada desde caché, reiniciando estado...");
    recommender = null;
    listenersInitialized = false;
    isProcessingRecommendations = false;
    initializeRecommender();
  }
});
