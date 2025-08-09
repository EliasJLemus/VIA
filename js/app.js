import TravelRecommender from "./model.js";

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
  container.innerHTML = "";
  container.style.display = "grid";
  container.className = "recommendations-container";

  if (!recomendaciones || recomendaciones.length === 0) {
    container.classList.add("recommendations-1");
    container.innerHTML = `
            <div class="card-recomendacion no-results-card">
                <div class="card-recomendacion-content">
                    <div class="info-container">
                        <h3>
                        Oh no, lo sentimos. :(<br>
                        No se encontraron destinos.
                      </h3>
                      <p>Intenta ajustando los criterios de búsqueda.</p>
                    </div>
                </div>
            </div>
        `;
    container.classList.add("visible");
    isProcessingRecommendations = false;
    return;
  }

  container.classList.add(`recommendations-${recomendaciones.length}`);

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

    container.innerHTML = cards.join("");
  } catch (error) {
    console.error("Error al crear tarjetas:", error);
  }

  container.classList.add("visible");
  isProcessingRecommendations = false;
}

function setupEventListeners() {
  console.log("Configurando event listeners...");
  const regionSelect = document.getElementById("region");
  const paisSelect = document.getElementById("pais");
  const ciudadSelect = document.getElementById("ciudad");
  const form = document.getElementById("recommendationForm");

  regionSelect.removeEventListener("change", handleRegionChange);
  paisSelect.removeEventListener("change", handlePaisChange);
  form.removeEventListener("submit", handleFormSubmit);

  regionSelect.addEventListener("change", handleRegionChange);
  paisSelect.addEventListener("change", handlePaisChange);
  form.addEventListener("submit", handleFormSubmit);

  setupTouchInteractions();

  console.log("Event listeners configurados correctamente.");
}

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
  const presupuesto = parseInt(formData.get("presupuesto"));

  if (isNaN(presupuesto)) {
    alert("Por favor, ingresa un presupuesto válido.");
    return;
  }

  if (presupuesto < 1) {
    alert("El presupuesto debe ser mayor o igual a $1.");
    return;
  }

  const datos = {
    region: formData.get("region"),
    pais: formData.get("pais"),
    ciudad: formData.get("ciudad"),
    tipoTurismo: formData.get("tipoTurismo"),
    presupuesto: presupuesto,
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

function setupTouchInteractions() {
  document.addEventListener("DOMContentLoaded", () => {
    const addTouchClass = () => {
      if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add("touch-device");
      }
    };

    addTouchClass();

    document.addEventListener(
      "touchstart",
      function (e) {
        const card = e.target.closest(".card, .card-recomendacion");
        if (card) {
          document
            .querySelectorAll(".card.active, .card-recomendacion.active")
            .forEach((el) => {
              if (el !== card) el.classList.remove("active");
            });

          card.classList.toggle("active");
          e.preventDefault();
        }
      },
      { passive: false }
    );
  });
}

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

function setupParallaxEffect() {
  const hero = document.querySelector(".hero");

  if (window.innerWidth >= 1025) {
    hero.classList.add("parallax-effect");
    // Eliminado el event listener de mousemove para quitar el efecto parallax
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado, inicializando recomendador...");
  initializeRecommender();
  setupParallaxEffect();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    console.log("Página restaurada desde caché, reiniciando estado...");
    recommender = null;
    listenersInitialized = false;
    isProcessingRecommendations = false;
    initializeRecommender();
  }
});
