// ================================================
// Configuración Inicial y Variables Globales
// ================================================

// Configuración de las propiedades del script
const scriptProperties = PropertiesService.getScriptProperties();
const USERNAME = scriptProperties.getProperty('USERNAME'); // Tu nombre de usuario de WordPress
const PASSWORD = scriptProperties.getProperty('PASSWORD'); // Tu contraseña de WordPress
const LAST_RUN_TIME_PROP = 'LAST_RUN_TIME';
const MANUAL_START_ROW_PROP = 'MANUAL_START_ROW';

// Endpoints de la API REST de WordPress
const WP_API_BASE = 'https://trefa.mx/wp-json';
const WP_CUSTOM_AUTOS_ENDPOINT = `${WP_API_BASE}/wp/v2/autos`; // Endpoint personalizado para 'autos'
const WP_MEDIA_ENDPOINT = `${WP_API_BASE}/wp/v2/media`; // Endpoint para medios
const WP_TAXONOMIES_BASE = `${WP_API_BASE}/wp/v2`; // Base para taxonomías (makes, models, etc.)
const WP_RELATIONS_ENDPOINT = 'https://trefa.mx/wp-json/jet-rel'; // Endpoint base para relaciones

// Configuración de la hoja de cálculo
const SHEET_NAME = 'ScrapeData'; // Nombre de la hoja de cálculo
const BATCH_SIZE = 5; // Número de filas a procesar por ejecución

// Mapeo de encabezados de la hoja de cálculo a claves utilizadas en el script
const headerMapping = {
  'estatus': 'estatus',
  'post_id': 'post_id',
  'ordenid': 'ordenid',
  'ordenfolio': 'ordenfolio',
  'ordencompra': 'ordencompra',
  'automarca': 'automarca',
  'autosubmarcaversion': 'autosubmarcaversion',
  'autoano': 'autoano',
  'autoprecio': 'autoprecio',
  'clasificacionid': 'clasificacionid',
  'autokilometraje': 'autokilometraje',
  'sucursalid': 'sucursalid',
  'sucursal': 'sucursal',
  'enganchemin': 'enganchemin',
  'mensualidad': 'mensualidad',
  'plazo': 'plazo',
  'fotooficial': 'fotooficial',
  'colorexterior': 'colorexterior',
  'colorinterior': 'colorinterior',
  'autocilindros': 'autocilindros',
  'autocombustible': 'autocombustible',
  'autotransmision': 'autotransmision',
  'autogarantia': 'autogarantia',
  'automotor': 'automotor',
  'numerosiniestros': 'nosiniestros',
  'detallesesteticos': 'detallesesteticos',
  'proximamente': 'proximamente',
  'separado': 'separado',
  'fotosexterior': 'fotos_exterior',
  'fotosinterior': 'fotos_interior',
  'foto360': 'foto360',
  'separable': 'separable',
  'montoseparacion': 'montoseparacion',
  'keyword': 'keyword',
  'supportkeywordslist': 'supportkeywordslist',
  'metadescripcion': 'metadescripcion',
  'ordenstatus': 'ordenstatus',
  'ultimamodificacion': 'ultimamodificacion',
  'last_sync_time': 'last_sync_time', // Nueva columna para registrar la última sincronización
  'make_id': 'make_id',
  'model_id': 'model_id',
  'featured_image_id': 'featured_image_id',
  'fotos_exterior_ids': 'fotos_exterior_ids',
  'fotos_interior_ids': 'fotos_interior_ids'
};