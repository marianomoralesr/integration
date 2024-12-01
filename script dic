// ================================================
// Configuración y Constantes
// ================================================

// Recuperar las propiedades necesarias de forma segura
const scriptProperties = PropertiesService.getScriptProperties();

// Credenciales de WordPress (asegúrate de configurar estas propiedades en las propiedades del script)
const USERNAME = scriptProperties.getProperty('USERNAME'); // Tu nombre de usuario de WordPress
const PASSWORD = scriptProperties.getProperty('PASSWORD'); // Tu contraseña de WordPress

// Definir los endpoints de la API de WordPress
const WP_API_BASE = 'https://trefa.mx/wp-json';
const WP_CUSTOM_AUTOS_ENDPOINT = `${WP_API_BASE}/wp/v2/autos`; // Endpoint personalizado para 'autos'
// const WP_MEDIA_ENDPOINT = `${WP_API_BASE}/wp/v2/media`; // Endpoint para medios (Removido)
const WP_TAXONOMIES_BASE = `${WP_API_BASE}/wp/v2`; // Base para taxonomías (makes, models, etc.)
const WP_RELATIONS_ENDPOINT = 'https://trefa.mx/wp-json/jet-rel'; // Endpoint base para relaciones

// Configuración de Google Sheets
const SHEET_NAME = 'ScrapeData'; // Nombre de la hoja de cálculo
const BATCH_SIZE = 15; // Número de filas a procesar por ejecución
const MANUAL_START_ROW_PROP = 'MANUAL_START_ROW';

// Mapeo de encabezados de la hoja de cálculo a claves internas (todas en minúsculas)
const headerMapping = {
  'estatus': 'estatus',
  'post_id': 'post_id',
  'ordenid': 'OrdenID',
  'ordenfolio': 'OrdenFolio',
  'ordencompra': 'OrdenCompra',
  'automarca': 'AutoMarca',
  'autosubmarcaversion': 'AutoSubmarcaVersion',
  'autoano': 'AutoAno',
  'autoprecio': 'AutoPrecio',
  'clasificacionid': 'ClasificacionID',
  'autokilometraje': 'AutoKilometraje',
  'sucursalid': 'SucursalID',
  'enganchemin': 'EngancheMin',
  'fotooficial': 'FotoOficial',
  'colorexterior': 'ColorExterior',
  'colorinterior': 'ColorInterior',
  'autocilindros': 'AutoCilindros',
  'autocombustible': 'AutoCombustible',
  'autotransmision': 'AutoTransmision',
  'autogarantia': 'AutoGarantia',
  'automotor': 'AutoMotor',
  'numerosiniestros': 'NumeroSiniestros',
  'detallesesteticos': 'DetallesEsteticos',
  'proximamente': 'Proximamente',
  'separado': 'Separado',
  'foto360': 'Foto360',
  'separable': 'Separable',
  'montoseparacion': 'MontoSeparacion',
  'keyword': 'Keyword',
  'supportkeywordslist': 'SupportKeywordsList',
  'metadescripcion': 'MetaDescripcion',
  'ordenstatus': 'OrdenStatus',
  'ordenstatusanterior': 'OrdenStatusAnterior',
  'ultimamodificacion': 'UltimaModificacion',
  'makes_id': 'makes_id',
  'models_id': 'models_id',
  'last_sync_time': 'last_sync_time',
  'featured_media': 'featured_media',
  'poststatus': 'PostStatus',
  'vendido': 'Vendido',
  'fotosinterior': 'fotosinterior',
  'fotosexterior': 'fotosexterior',
  'status_message': 'status_message',
  'titulometa': 'TituloMeta',
  'title': 'Title',
  'PlazoMax': PlazoMax,
  'pagomensual': 'PagoMensual',
  'enganche': 'Enganche' // Añadido para mapear 'Enganche'
};

// Inicializar contadores de estadísticas
let postStats = { ignored: 0, updated: 0, trashed: 0, created: 0, failed: 0 };

// ================================================
// Caché Global de Términos
// ================================================

let termCache = {
  makes: {},
  models: {},
  sucursal: {},
  clasificacionid: {}
};

// ================================================
// Funciones de Utilidad
// ================================================

/**
 * Envía un correo electrónico de error al administrador.
 * @param {String} errorMessage - Mensaje de error.
 */
function sendErrorEmail(errorMessage) {
  try {
    const adminEmail = Session.getActiveUser().getEmail();
    const subject = 'Error en la sincronización con WordPress';
    const body = `Se ha producido un error durante la sincronización con WordPress:\n\n${errorMessage}`;
    MailApp.sendEmail(adminEmail, subject, body);
    Logger.log(`sendErrorEmail: Correo enviado a ${adminEmail}`);
  } catch (error) {
    Logger.log(`sendErrorEmail: No se pudo enviar el correo electrónico de error: ${error.message}`);
  }
}

/**
 * Genera un slug a partir de un texto dado.
 * @param {String} text - Texto para generar el slug.
 * @return {String} Slug generado.
 */
function generateSlug(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Sanitiza un nombre de archivo eliminando caracteres no permitidos.
 * @param {String} filename - Nombre de archivo original.
 * @return {String} Nombre de archivo sanitizado.
 */
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9\-\_\.]/gi, '_');
}

/**
 * Obtiene los índices de las columnas basándose en los encabezados.
 * @param {Array} headers - Array de encabezados de la hoja de cálculo.
 * @return {Object} Mapeo de nombres internos de columnas a índices.
 */
function getColumnIndices(headers) {
  const indices = {};
  headers.forEach((header, index) => {
    const normalizedHeader = header.toString().toLowerCase().trim();
    if (headerMapping.hasOwnProperty(normalizedHeader)) {
      const internalKey = headerMapping[normalizedHeader];
      indices[internalKey] = index;
    }
  });
  Logger.log(`getColumnIndices: Encabezados Normalizados e Índices: ${JSON.stringify(indices)}`);
  return indices;
}

/**
 * Obtiene un bloqueo global para evitar ejecuciones simultáneas.
 * @return {Lock} Objeto de bloqueo.
 */
function getLock() {
  return LockService.getScriptLock();
}

// ================================================
// Funciones de Autenticación con WordPress
// ================================================

/**
 * Obtiene un token JWT válido, renovándolo si es necesario.
 * @return {String} Token JWT válido.
 */
function getValidJwtToken() {
  let tokenInfo = scriptProperties.getProperty('JWT_TOKEN_INFO');
  if (tokenInfo) {
    tokenInfo = JSON.parse(tokenInfo);
  } else {
    tokenInfo = getJwtToken();
    if (!tokenInfo) throw new Error('getValidJwtToken: No se pudo obtener el token JWT.');
    scriptProperties.setProperty('JWT_TOKEN_INFO', JSON.stringify(tokenInfo));
    Logger.log('getValidJwtToken: Token JWT inicial obtenido y almacenado.');
  }

  const now = new Date().getTime();
  if (now >= tokenInfo.expiresAt) {
    Logger.log('getValidJwtToken: El token JWT ha expirado. Obteniendo uno nuevo.');
    tokenInfo = getJwtToken();
    if (!tokenInfo) throw new Error('getValidJwtToken: No se pudo renovar el token JWT.');
    scriptProperties.setProperty('JWT_TOKEN_INFO', JSON.stringify(tokenInfo));
    Logger.log('getValidJwtToken: Token JWT renovado y almacenado.');
  }

  return tokenInfo.token;
}

/**
 * Obtiene un nuevo token JWT desde WordPress.
 * @return {Object|null} Objeto con el token y su tiempo de expiración, o null si falla.
 */
function getJwtToken() {
  const url = 'https://trefa.mx/wp-json/jwt-auth/v1/token';
  const payload = { username: USERNAME, password: PASSWORD };
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    Logger.log(`getJwtToken: Código de respuesta: ${responseCode}`);
    Logger.log(`getJwtToken: Respuesta de autenticación: ${responseText}`);

    const jsonResponse = JSON.parse(responseText);
    if (responseCode === 200 && jsonResponse.data && jsonResponse.data.token) {
      Logger.log('getJwtToken: Token JWT obtenido exitosamente.');
      const token = jsonResponse.data.token;
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('getJwtToken: Formato de token JWT inválido.');
      }
      const payloadDecoded = Utilities.newBlob(Utilities.base64Decode(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))).getDataAsString();
      const payloadJson = JSON.parse(payloadDecoded);
      const exp = payloadJson.exp * 1000; // Convertir a milisegundos
      return { token: token, expiresAt: exp };
    } else {
      Logger.log('getJwtToken: Fallo al obtener el token JWT. Respuesta: ' + responseText);
    }
  } catch (error) {
    Logger.log('getJwtToken: Error al obtener el token JWT: ' + error.message);
  }
  return null;
}

/**
 * Realiza una solicitud a la API de WordPress con manejo de errores y renovación de token si es necesario.
 * @param {String} method - Método HTTP ('GET', 'POST', etc.).
 * @param {String} endpoint - URL del endpoint de la API.
 * @param {Object|null} data - Datos a enviar en la solicitud.
 * @param {Number} [retries=3] - Número de reintentos en caso de fallo.
 * @return {Object} Respuesta JSON de la API.
 */
function wpApiRequest(method, endpoint, data, retries = 3) {
  let token = getValidJwtToken();

  const options = {
    method: method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true
  };
  
  if (data) {
    options.payload = JSON.stringify(data);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      Logger.log(`wpApiRequest: Intento ${attempt} para ${method} ${endpoint}`);
      const response = UrlFetchApp.fetch(endpoint, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      Logger.log(`wpApiRequest: Código de respuesta: ${responseCode}`);
      Logger.log(`wpApiRequest: Respuesta: ${responseText}`);

      if (responseCode === 403) {
        const errorResponse = JSON.parse(responseText);
        if (errorResponse.code === 'jwt_auth_invalid_token') {
          Logger.log('wpApiRequest: Token JWT inválido o expirado. Renovando token.');
          const newTokenInfo = getJwtToken();
          if (!newTokenInfo) throw new Error('wpApiRequest: No se pudo renovar el token JWT.');
          scriptProperties.setProperty('JWT_TOKEN_INFO', JSON.stringify(newTokenInfo));
          token = newTokenInfo.token;
          options.headers.Authorization = `Bearer ${token}`;
          continue; // Reintentar con el nuevo token
        }
      }

      if (responseCode >= 400) {
        Logger.log(`wpApiRequest: Error en la solicitud a ${endpoint}: ${responseText}`);
        throw new Error(`Error en la solicitud a ${endpoint}: ${responseText}`);
      }

      if (!responseText) {
        Logger.log(`wpApiRequest: Respuesta vacía de la solicitud a ${endpoint}`);
        throw new Error(`Respuesta vacía de la solicitud a ${endpoint}`);
      }

      const jsonResponse = JSON.parse(responseText);
      Logger.log(`wpApiRequest: Respuesta parseada correctamente.`);
      return jsonResponse;
    } catch (error) {
      Logger.log(`wpApiRequest: Intento ${attempt} de ${retries} fallido: ${error.message}`);
      if (attempt === retries) {
        throw error;
      }
      Utilities.sleep(1000 * attempt); // Esperar antes de reintentar
    }
  }
}

// ================================================
// Funciones de Gestión de Publicaciones en WordPress
// ================================================

/**
 * Obtiene los datos de una publicación existente en WordPress.
 * @param {String} postId - ID de la publicación en WordPress.
 * @return {Object|null} Objeto con los datos del post o null si no se encuentra.
 */
function getExistingPostData(postId) {
  const url = `${WP_CUSTOM_AUTOS_ENDPOINT}/${postId}?_embed`;
  try {
    const post = wpApiRequest('GET', url, null);
    if (post && post.id) {
      Logger.log(`getExistingPostData: Datos obtenidos para post ID ${postId}.`);
      return post;
    } else {
      Logger.log(`getExistingPostData: No se pudieron obtener datos para post ID ${postId}.`);
      return null;
    }
  } catch (error) {
    Logger.log(`getExistingPostData: Error al obtener datos del post con ID ${postId}: ${error.message}`);
    return null;
  }
}

/**
 * Busca una publicación existente en WordPress por el campo 'OrdenCompra' usando el endpoint personalizado.
 * @param {String} ordencompra - Valor de 'OrdenCompra' para buscar.
 * @return {String|null} ID de la publicación como cadena si existe, de lo contrario null.
 */
function findPostByOrdenCompra(ordencompra) {
  if (!ordencompra || ordencompra.trim() === '') {
    Logger.log('findPostByOrdenCompra: OrdenCompra está vacío. No se buscará un post existente.');
    return null;
  }

  const searchUrl = `${WP_CUSTOM_AUTOS_ENDPOINT}?ordencompra=${encodeURIComponent(ordencompra.trim())}`;

  try {
    const posts = wpApiRequest('GET', searchUrl, null);
    if (Array.isArray(posts) && posts.length > 0) {
      // Filtrar posts donde 'ordencompra' coincide exactamente
      const matchingPost = posts.find(post => post.meta && post.meta['OrdenCompra'] === ordencompra.trim());
      if (matchingPost) {
        Logger.log(`findPostByOrdenCompra: Post encontrado para OrdenCompra '${ordencompra}': ID ${matchingPost.id}`);
        return String(matchingPost.id); // Convertir a cadena
      } else {
        Logger.log(`findPostByOrdenCompra: No se encontró ningún post con OrdenCompra exactamente igual a '${ordencompra}'.`);
        return null;
      }
    } else {
      Logger.log(`findPostByOrdenCompra: No se encontró ningún post para OrdenCompra '${ordencompra}'.`);
      return null;
    }
  } catch (error) {
    Logger.log(`findPostByOrdenCompra: Error al buscar post con OrdenCompra '${ordencompra}': ${error.message}`);
    return null;
  }
}

/**
 * Crea un término en una taxonomía y devuelve su ID, slug y nombre. Si ya existe, devuelve los datos existentes.
 * @param {string} termName - Nombre del término.
 * @param {string} taxonomy - Nombre de la taxonomía.
 * @param {string|null} [parent=null] - ID del término padre como cadena, si aplica.
 * @return {Object|null} Objeto con 'id', 'slug' y 'name' del término o null si falla.
 */
function createTermAndGetData(termName, taxonomy, parent = null) {
  if ((typeof termName !== 'string' && typeof termName !== 'number') || String(termName).trim() === '') {
    Logger.log(`createTermAndGetData: termName inválido para taxonomía ${taxonomy}.`);
    return null;
  }

  const sanitizedTermName = String(termName).trim();
  const slug = generateSlug(sanitizedTermName);
  const searchUrl = `${WP_TAXONOMIES_BASE}/${taxonomy}?slug=${encodeURIComponent(slug)}`;

  try {
    // Busca si el término ya existe por slug
    const terms = wpApiRequest('GET', searchUrl, null);

    if (Array.isArray(terms) && terms.length > 0) {
      Logger.log(`createTermAndGetData: Término existente encontrado para ${termName} en taxonomía ${taxonomy}: ID ${terms[0].id}`);
      // Almacenar en caché
      termCache[taxonomy][sanitizedTermName] = { id: String(terms[0].id), slug: terms[0].slug, name: terms[0].name };
      return { id: String(terms[0].id), slug: terms[0].slug, name: terms[0].name };
    }

    // Si el término no existe, lo crea con el nombre y slug
    const createPayload = { name: sanitizedTermName, slug: slug };
    if (parent) {
      createPayload.parent = parent;
    }

    const createdTerm = wpApiRequest('POST', `${WP_TAXONOMIES_BASE}/${taxonomy}`, createPayload);
    if (createdTerm && createdTerm.id) {
      Logger.log(`createTermAndGetData: Término creado para ${termName} en taxonomía ${taxonomy}: ID ${createdTerm.id}`);
      // Almacenar en caché
      termCache[taxonomy][sanitizedTermName] = { id: String(createdTerm.id), slug: createdTerm.slug, name: createdTerm.name };
      return { id: String(createdTerm.id), slug: createdTerm.slug, name: createdTerm.name };
    } else {
      Logger.log(`createTermAndGetData: Falló al crear el término ${termName} en taxonomía ${taxonomy}.`);
      return null;
    }
  } catch (error) {
    Logger.log(`createTermAndGetData: Error al crear o obtener el término ${termName} en taxonomía ${taxonomy}: ${error.message}`);
    return null;
  }
}

/**
 * Inicializa el caché de términos pre-cargando todos los términos existentes.
 */
function initializeTermCache() {
  const taxonomies = ['makes', 'models', 'sucursal', 'clasificacionid'];

  taxonomies.forEach(taxonomy => {
    termCache[taxonomy] = {};
    try {
      const terms = wpApiRequest('GET', `${WP_TAXONOMIES_BASE}/${taxonomy}`, null);

      if (Array.isArray(terms)) {
        terms.forEach(term => {
          termCache[taxonomy][term.name] = { id: String(term.id), slug: term.slug, name: term.name };
        });
        Logger.log(`initializeTermCache: Cargados ${terms.length} términos para la taxonomía ${taxonomy}.`);
      }
    } catch (error) {
      // Error al cargar términos para la taxonomía
      Logger.log(`initializeTermCache: Error al cargar términos para la taxonomía ${taxonomy}: ${error.message}`);
    }
  });
}

// ================================================
// Funciones de Procesamiento de Datos
// ================================================

/**
 * Mapea los datos de una fila a los nombres internos definidos en headerMapping.
 * @param {Array} row - Array de valores de la fila.
 * @param {Object} headerIndices - Mapeo de nombres internos de columnas a índices.
 * @return {Object} Objeto con los datos de la fila mapeados a claves internas.
 */
function getRowData(row, headerIndices) {
  const rowData = {};
  for (let internalKey in headerIndices) {
    const index = headerIndices[internalKey];
    const value = row[index];
    rowData[internalKey] = value !== undefined ? value : '';
  }
  Logger.log(`getRowData: Mapped rowData = ${JSON.stringify(rowData)}`);
  return rowData;
}

/**
 * Verifica si una fila necesita ser procesada.
 * @param {Object} rowData - Datos de la fila mapeados a claves internas.
 * @return {Boolean} True si necesita ser procesada, de lo contrario false.
 */
function rowNeedsProcessing(rowData) {
  const isUpdatedAfterLastSync = isRowUpdatedAfterLastSync(rowData);
  const ordenStatus = rowData['OrdenStatus'] ? rowData['OrdenStatus'].toString().trim().toLowerCase() : '';
  const ordenStatusAnterior = rowData['OrdenStatusAnterior'] ? rowData['OrdenStatusAnterior'].toString().trim().toLowerCase() : '';
  const isComprado = ordenStatus === 'comprado';
  const hasPostId = rowData['post_id'] && rowData['post_id'].toString().trim() !== '';
  const isHistoricoWithPost = ordenStatus === 'historico' && hasPostId;

  Logger.log(`rowNeedsProcessing: isUpdatedAfterLastSync = ${isUpdatedAfterLastSync}, OrdenStatus = '${ordenStatus}', OrdenStatusAnterior = '${ordenStatusAnterior}', isComprado = ${isComprado}, isHistoricoWithPost = ${isHistoricoWithPost}`);

  if (isUpdatedAfterLastSync && (isComprado || isHistoricoWithPost)) {
    return true;
  }

  Logger.log(`rowNeedsProcessing: Fila omitida porque no cumple con las condiciones de actualización.`);
  return false; // Saltar si no cumple con las condiciones
}

/**
 * Verifica si la fila ha sido modificada después de la última sincronización.
 * @param {Object} rowData - Datos de la fila mapeados a claves internas.
 * @return {Boolean} True si ha sido modificada después, de lo contrario false.
 */
function isRowUpdatedAfterLastSync(rowData) {
  const ultimaModificacion = rowData['UltimaModificacion'] ? new Date(rowData['UltimaModificacion']) : null;
  const lastSyncTime = rowData['last_sync_time'] ? new Date(rowData['last_sync_time']) : null;

  if (!ultimaModificacion) {
    Logger.log('isRowUpdatedAfterLastSync: UltimaModificacion no está definida.');
    return false;
  }

  if (!lastSyncTime) {
    Logger.log('isRowUpdatedAfterLastSync: last_sync_time no está definida. Procesando la fila.');
    return true; // Si no hay última sincronización, procesar la fila
  }

  const isUpdated = ultimaModificacion > lastSyncTime;
  Logger.log(`isRowUpdatedAfterLastSync: UltimaModificacion (${ultimaModificacion}) > last_sync_time (${lastSyncTime}) = ${isUpdated}`);
  return isUpdated;
}

/**
 * Procesa una fila para crear o actualizar una publicación en WordPress.
 * @param {Object} rowData - Datos de la fila mapeados a claves internas.
 * @param {String|null} existingPostId - ID existente del post en WordPress como cadena, o null si no existe.
 * @param {Sheet} sheet - Hoja de cálculo activa.
 * @param {Number} rowIndex - Índice de la fila actual (0-based).
 * @param {Object} headerIndices - Mapeo de nombres internos de columnas a índices.
 */
function processRow(rowData, existingPostId, sheet, rowIndex, headerIndices) {
  let lock;
  try {
    // Agregar log para verificar rowData y rowIndex
    Logger.log(`processRow: rowIndex = ${rowIndex}, rowData = ${JSON.stringify(rowData)}`);

    // Validar rowData
    if (!rowData) {
      throw new Error('processRow: rowData es undefined o null.');
    }

    // Adquirir un bloqueo para evitar ejecuciones simultáneas
    lock = getLock();
    lock.waitLock(30000); // Esperar hasta 30 segundos para el bloqueo

    const ordenStatus = rowData['OrdenStatus'] ? String(rowData['OrdenStatus']).trim().toLowerCase() : '';
    const ordenStatusAnterior = rowData['OrdenStatusAnterior'] ? String(rowData['OrdenStatusAnterior']).trim().toLowerCase() : '';
    const ordencompra = rowData['OrdenCompra'] ? String(rowData['OrdenCompra']).trim() : '';
    const postIdColumnIndex = headerIndices['post_id']; // Índice de columna para 'post_id'

    Logger.log(`processRow: OrdenStatus = '${ordenStatus}', OrdenStatusAnterior = '${ordenStatusAnterior}'`);

    let postId = existingPostId;

    // Verificar si el ID del post existe en WordPress
    if (!postId && ordencompra) {
      postId = findPostByOrdenCompra(ordencompra);
      if (postId) {
        Logger.log(`processRow: Post encontrado para OrdenCompra '${ordencompra}' con ID ${postId}`);
        sheet.getRange(rowIndex + 2, postIdColumnIndex + 1).setValue(postId); // Registrar el ID del post encontrado
      }
    }

    if (!postId) {
      // Si no existe un post con el 'ordencompra', crear uno nuevo
      Logger.log(`processRow: No se encontró un post para OrdenCompra '${ordencompra}'. Creando uno nuevo.`);
      
      // Preparar los datos para crear el post
      const commonData = {
        title: `${rowData.AutoMarca || ''} ${rowData.AutoSubmarcaVersion || ''} ${rowData.AutoAno || ''}`.trim(),
        content: rowData.MetaDescripcion || `Detalles para ${rowData.AutoMarca} ${rowData.AutoSubmarcaVersion}`,
        status: 'publish', // Crear con estado 'publish'
        meta: {
          'OrdenStatus': String(rowData.OrdenStatus),
          'OrdenCompra': ordencompra,
          'OrdenID': String(rowData.OrdenID),
          'OrdenFolio': String(rowData.OrdenFolio),
          'AutoMarca': String(rowData.AutoMarca),
          'AutoSubmarcaVersion': String(rowData.AutoSubmarcaVersion),
          'AutoAno': String(rowData.AutoAno),
          'AutoPrecio': String(rowData.AutoPrecio),
          'ClasificacionID': String(rowData.ClasificacionID),
          'AutoKilometraje': String(rowData.AutoKilometraje),
          'SucursalID': String(rowData.SucursalID),
          'EngancheMin': String(rowData.EngancheMin),
          'Mensualidad': String(rowData.PagoMensual),
          'PlazoMax': String(rowData.Plazo),
          'FotoOficial': String(rowData.FotoOficial),
          'ColorExterior': String(rowData.ColorExterior),
          'ColorInterior': String(rowData.ColorInterior),
          'AutoCilindros': String(rowData.AutoCilindros),
          'AutoCombustible': String(rowData.AutoCombustible),
          'AutoTransmision': String(rowData.AutoTransmision),
          'AutoGarantia': String(rowData.AutoGarantia),
          'AutoMotor': String(rowData.AutoMotor),
          'NumeroSiniestros': String(rowData.NumeroSiniestros),
          'DetallesEsteticos': String(rowData.DetallesEsteticos),
          'Proximamente': String(rowData.Proximamente),
          'Separado': String(rowData.Separado),
          'MontoSeparacion': String(rowData.MontoSeparacion),
          'Keyword': String(rowData.Keyword),
          'SupportKeywordsList': String(rowData.SupportKeywordsList),
          'TituloMeta': String(rowData.TituloMeta),
          'OrdenStatusAnterior': String(rowData.OrdenStatusAnterior),
          'Vendido': 'false' // Por defecto
        }
      };

      // Crear el post
      const response = wpApiRequest('POST', WP_CUSTOM_AUTOS_ENDPOINT, commonData);

      if (response && response.id) {
        postId = response.id;
        Logger.log(`processRow: Post creado con ID ${postId} para OrdenCompra '${ordencompra}'`);
        postStats.created++;
        sheet.getRange(rowIndex + 2, postIdColumnIndex + 1).setValue(postId); // Registrar el nuevo ID del post

        // Obtener o crear términos relacionados (taxonomías)
        const makeData = rowData.AutoMarca ? createTermAndGetData(rowData.AutoMarca, 'makes') : null;
        const modelData = rowData.AutoSubmarcaVersion ? createTermAndGetData(rowData.AutoSubmarcaVersion, 'models') : null;
        const sucursalData = rowData.SucursalID ? createTermAndGetData(rowData.SucursalID, 'sucursal') : null;
        const clasificacionData = rowData.ClasificacionID ? createTermAndGetData(rowData.ClasificacionID, 'clasificacionid') : null;

        // Asignar taxonomías directamente como campos de nivel superior con IDs como números
        const taxonomyData = {
          'makes': makeData && makeData.id ? [Number(makeData.id)] : [],
          'models': modelData && modelData.id ? [Number(modelData.id)] : [],
          'clasificacionid': clasificacionData && clasificacionData.id ? [Number(clasificacionData.id)] : [],
          'sucursal': sucursalData && sucursalData.id ? [Number(sucursalData.id)] : []
        };

        // Actualizar el post con las taxonomías
        wpApiRequest('POST', `${WP_CUSTOM_AUTOS_ENDPOINT}/${postId}`, taxonomyData);

        // Gestionar relaciones en WordPress
        manageRelations(postId, makeData, modelData, sucursalData);

      } else {
        throw new Error(`processRow: Falló al crear el post para OrdenCompra '${ordencompra}'`);
      }

    } else {
      // Actualizar post existente
      Logger.log(`processRow: Actualizando post existente ID ${postId}`);

      // Obtener datos existentes del post si no se han obtenido aún
      if (!existingData) {
        existingData = getExistingPostData(postId);
      }

      // Determinar el valor del campo 'Vendido' basado en el cambio de 'OrdenStatus'
      let vendidoValue = 'false';
      if (ordenStatusAnterior === 'comprado' && ordenStatus === 'historico') {
        vendidoValue = 'true';
      }

      // Preparar los datos comunes para actualización
      const commonData = {
        title: `${rowData.AutoMarca || ''} ${rowData.AutoSubmarcaVersion || ''} ${rowData.AutoAno || ''}`.trim(),
        content: rowData.MetaDescripcion || `Detalles para ${rowData.AutoMarca} ${rowData.AutoSubmarcaVersion}`,
        // No cambiamos el estado del post
        meta: {
          'ordenstatus': String(rowData.OrdenStatus),
          'ordencompra': ordencompra,
          'ordenID': String(rowData.OrdenID),
          'Ordenfolio': String(rowData.OrdenFolio),
          'automarca': String(rowData.AutoMarca),
          'autosubmarcaversion': String(rowData.AutoSubmarcaVersion),
          'autoano': String(rowData.AutoAno),
          'autoprecio': String(rowData.AutoPrecio),
          'clasificacionid': String(rowData.ClasificacionID),
          'autokilometraje': String(rowData.AutoKilometraje),
          'sucursal': String(rowData.SucursalID),
          'enganche': String(rowData.Enganche),
          'pagomensual': String(rowData.Mensualidad),
          'plazomax': String(rowData.PlazoMax),
          'fotooficial': String(rowData.FotoOficial),
          'colorexterior': String(rowData.ColorExterior),
          'colorinterior': String(rowData.ColorInterior),
          'autocilindros': String(rowData.AutoCilindros),
          'autocombustible': String(rowData.AutoCombustible),
          'autotransmision': String(rowData.AutoTransmision),
          'autogarantia': String(rowData.AutoGarantia),
          'automotor': String(rowData.AutoMotor),
          'NumeroSiniestros': String(rowData.NumeroSiniestros),
          'DetallesEsteticos': String(rowData.DetallesEsteticos),
          'proximamente': String(rowData.Proximamente),
          'separado': String(rowData.Separado),
          'MontoSeparacion': String(rowData.MontoSeparacion),
          'keyword': String(rowData.Keyword),
          'SupportKeywordsList': String(rowData.SupportKeywordsList),
          'titulometa': String(rowData.TituloMeta),
          'ordenstatusanterior': String(rowData.OrdenStatusAnterior),
          'vendido': vendidoValue // Establecer el valor calculado de 'Vendido'
        }
      };

      // Obtener o crear términos relacionados (taxonomías)
      const makeData = rowData.AutoMarca ? createTermAndGetData(rowData.AutoMarca, 'makes') : null;
      const modelData = rowData.AutoSubmarcaVersion ? createTermAndGetData(rowData.AutoSubmarcaVersion, 'models') : null;
      const sucursalData = rowData.SucursalID ? createTermAndGetData(rowData.SucursalID, 'sucursal') : null;
      const clasificacionData = rowData.ClasificacionID ? createTermAndGetData(rowData.ClasificacionID, 'clasificacionid') : null;

      // Asignar taxonomías directamente como campos de nivel superior con IDs como números
      commonData['makes'] = makeData && makeData.id ? [Number(makeData.id)] : [];
      commonData['models'] = modelData && modelData.id ? [Number(modelData.id)] : [];
      commonData['clasificacionid'] = clasificacionData && clasificacionData.id ? [Number(clasificacionData.id)] : [];
      commonData['sucursal'] = sucursalData && sucursalData.id ? [Number(sucursalData.id)] : [];

      // Preparar campos actualizados
      const updatedFields = getUpdatedFields(commonData, existingData);

      if (Object.keys(updatedFields).length > 0) {
        wpApiRequest('POST', `${WP_CUSTOM_AUTOS_ENDPOINT}/${postId}`, updatedFields);
        postStats.updated++;
        Logger.log(`processRow: Post ID ${postId} actualizado con nuevos datos`);

        // Actualizar relaciones si es necesario
        manageRelations(postId, makeData, modelData, sucursalData);
      } else {
        Logger.log(`processRow: No se detectaron cambios para el post ID ${postId}`);
        postStats.ignored++;
      }

      // Después de procesar exitosamente la fila
      updateSheetStatus(sheet, rowIndex, headerIndices, {
        status_message: 'Processed Successfully',
        estatus: 'Success'
      });
      updateLastSyncTime(sheet, rowIndex, headerIndices);
  } catch (error) {
    Logger.log(`processRow: Error procesando la fila ${rowIndex + 2}: ${error.message}`);
    postStats.failed++;
    updateSheetStatus(sheet, rowIndex, headerIndices, {
      status_message: `Error: ${error.message}`,
      estatus: 'Error'
    });
  } finally {
    if (lock) {
      try {
        lock.releaseLock();
        Logger.log(`processRow: Bloqueo liberado para la fila ${rowIndex + 2}`);
      } catch (releaseError) {
        Logger.log(`processRow: Error al liberar el bloqueo: ${releaseError.message}`);
      }
    }
  }
}

/**
 * Obtiene los campos actualizados comparando los nuevos datos con los existentes.
 * @param {Object} newData - Nuevos datos a comparar.
 * @param {Object} existingData - Datos existentes en WordPress.
 * @return {Object} Campos que han sido actualizados.
 */
function getUpdatedFields(newData, existingData) {
  const updatedFields = {};

  // Comparar título
  if (newData.title && newData.title !== existingData.title.rendered) {
    updatedFields.title = newData.title;
    Logger.log(`getUpdatedFields: Título actualizado a '${newData.title}'`);
  }

  // Comparar contenido
  if (newData.content && newData.content !== existingData.content.rendered) {
    updatedFields.content = newData.content;
    Logger.log(`getUpdatedFields: Contenido actualizado`);
  }

  // Comparar meta
  if (newData.meta) {
    const metaUpdates = {};
    for (let key in newData.meta) {
      const newValue = newData.meta[key];
      const oldValue = existingData.meta ? existingData.meta[key] : undefined;

      if (Array.isArray(newValue) && Array.isArray(oldValue)) {
        // Comparar arrays de IDs para 'galeria_exterior' y 'galeria_interior'
        if (key === 'galeria_exterior' || key === 'galeria_interior') {
          const oldStr = oldValue ? oldValue.join(',') : '';
          const newStr = newValue.join(',');
          if (newStr !== oldStr) {
            metaUpdates[key] = newValue;
            Logger.log(`getUpdatedFields: Meta '${key}' actualizado.`);
          }
        }
      } else if (newValue !== oldValue) {
        metaUpdates[key] = newValue;
        Logger.log(`getUpdatedFields: Meta '${key}' actualizado.`);
      }
    }
    if (Object.keys(metaUpdates).length > 0) {
      updatedFields.meta = metaUpdates;
    }
  }

  // Comparar taxonomías
  const taxonomies = ['makes', 'models', 'clasificacionid', 'sucursal'];
  taxonomies.forEach(taxonomy => {
    if (newData[taxonomy]) {
      const newTaxTerms = newData[taxonomy].map(id => Number(id)).sort((a, b) => a - b);
      const existingTaxTerms = existingData[taxonomy] ? existingData[taxonomy].map(term => Number(term.id)).sort((a, b) => a - b) : [];
      if (JSON.stringify(newTaxTerms) !== JSON.stringify(existingTaxTerms)) {
        updatedFields[taxonomy] = newTaxTerms;
        Logger.log(`getUpdatedFields: Taxonomía '${taxonomy}' actualizada.`);
      }
    }
  });

  return updatedFields;
}

/**
 * Gestiona las relaciones del post (Auto) con Marca, Modelo y Sucursal.
 * @param {String} postId - ID del post en WordPress como cadena.
 * @param {Object} makeData - Objeto con los datos de la Marca.
 * @param {Object} modelData - Objeto con los datos del Modelo.
 * @param {Object|null} sucursalData - Objeto con los datos de la Sucursal.
 */
function manageRelations(postId, makeData, modelData, sucursalData) {
  // Relación Make > Model (relationId: 3)
  if (makeData && makeData.id && modelData && modelData.id) {
    sendRelation(3, {
      parent_id: makeData.id,
      child_id: modelData.id,
      context: 'parent',
      store_items_type: 'replace',
      meta: {}
    });
  }

  // Relación Sucursal > Auto (relationId: 52)
  if (sucursalData && sucursalData.id) {
    sendRelation(52, {
      parent_id: sucursalData.id,
      child_id: postId,
      context: 'parent',
      store_items_type: 'replace',
      meta: {}
    });
  }

  // Relación Auto > Makes (relationId: 95)
  if (makeData && makeData.id) {
    sendRelation(95, {
      parent_id: postId,
      child_id: makeData.id,
      context: 'parent',
      store_items_type: 'replace',
      meta: {}
    });
  }
}

/**
 * Envía una relación al endpoint jet-rel/{relationId}.
 * @param {Number} relationId - ID de la relación específica.
 * @param {Object} payload - Datos de la relación.
 */
function sendRelation(relationId, payload) {
  try {
    const endpoint = `${WP_RELATIONS_ENDPOINT}/${relationId}`;
    wpApiRequest('POST', endpoint, payload);
    Logger.log(`sendRelation: Relación ${relationId} enviada correctamente.`);
  } catch (error) {
    Logger.log(`sendRelation: Error al enviar la relación ${relationId}: ${error.message}`);
    // Opcional: Puedes enviar un correo o manejar el error de otra manera si es crítico
  }
}

// ================================================
// Funciones de Gestión de Datos de WordPress
// ================================================

/**
 * Procesa la hoja de cálculo en lotes para crear o actualizar publicaciones en WordPress.
 */
function processSheet() {
  const lock = getLock();
  try {
    // Intentar adquirir el bloqueo, esperando hasta 30 segundos
    lock.waitLock(30000);
    Logger.log('processSheet: Bloqueo adquirido.');

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`processSheet: La hoja '${SHEET_NAME}' no existe.`);
    }

    const dataRange = sheet.getDataRange();
    const data = dataRange.getDisplayValues(); // Evitar problemas de formato
    const headers = data.shift(); // Remover encabezados del array de datos
    const headerIndices = getColumnIndices(headers);

    Logger.log(`processSheet: Cantidad de filas de datos: ${data.length}`);
    if (data.length === 0) {
      Logger.log('processSheet: No hay datos para procesar.');
      return;
    }

    let manualStartRow = scriptProperties.getProperty(MANUAL_START_ROW_PROP);
    let startIndex = 0;
    let processedCount = 0;

    if (manualStartRow) {
      const startRowNumber = parseInt(manualStartRow, 10); // Radix correcto
      if (isNaN(startRowNumber) || startRowNumber < 2) {
        startIndex = 0;
      } else {
        startIndex = startRowNumber - 2; // Convertir a índice 0-based y excluir encabezados
      }
      Logger.log(`processSheet: Inicio manual en la fila ${startRowNumber}`);
    }

    // Inicializar caché de términos
    initializeTermCache();

    // Resetear contadores de estadísticas antes de procesar
    resetPostStats();

    // Iterar sobre cada fila empezando desde startIndex
    for (let rowIndex = startIndex; rowIndex < data.length; rowIndex++) {
      Logger.log(`processSheet: Procesando rowIndex: ${rowIndex} (fila ${rowIndex + 2})`);
      const row = data[rowIndex];
      const rowData = getRowData(row, headerIndices);

      if (rowNeedsProcessing(rowData)) {
        try {
          const ordencompra = rowData['OrdenCompra'];
          let existingPostId = null;

          if (ordencompra && ordencompra.trim() !== '') {
            existingPostId = findPostByOrdenCompra(ordencompra);
          }

          processRow(rowData, existingPostId, sheet, rowIndex, headerIndices);
          processedCount++;
        } catch (rowError) {
          Logger.log(`processSheet: Error al procesar la fila ${rowIndex + 2}: ${rowError.message}`);
          postStats.failed++;
          continue;
        }

        // Verificar si se alcanzó el límite de tamaño de lote
        if (processedCount >= BATCH_SIZE) {
          scriptProperties.setProperty(MANUAL_START_ROW_PROP, (rowIndex + 2).toString());
          Logger.log(`processSheet: Límite de lote alcanzado. La próxima fila de inicio se establece en ${rowIndex + 2}.`);
          break;
        }

        Utilities.sleep(2000); // Pausa de 2 segundos para evitar límites de tasa
      } else {
        Logger.log(`processSheet: Fila ${rowIndex + 2} no requiere procesamiento.`);
      }
    }

    if (processedCount > 0) {
      logPostStats(); // Registrar estadísticas si se procesaron filas
    }

    // Resetear la fila de inicio si todas las filas han sido procesadas
    if (startIndex + processedCount >= data.length) {
      scriptProperties.deleteProperty(MANUAL_START_ROW_PROP);
      Logger.log('processSheet: Todas las filas han sido procesadas. Reseteando fila de inicio.');
    }

  } catch (error) {
    Logger.log(`processSheet: Error durante la ejecución: ${error.message}`);
    sendErrorEmail(error.message);
  } finally {
    // Liberar el bloqueo
    try {
      lock.releaseLock();
      Logger.log('processSheet: Bloqueo liberado.');
    } catch (releaseError) {
      Logger.log(`processSheet: Error al liberar el bloqueo: ${releaseError.message}`);
    }
  }
}

/**
 * Actualiza el estado de una fila en la hoja de cálculo, incluyendo 'OrdenStatusAnterior'.
 * @param {Sheet} sheet - Hoja de cálculo activa.
 * @param {Number} rowIndex - Índice de la fila actual (0-based).
 * @param {Object} headerIndices - Mapeo de nombres internos de columnas a índices.
 * @param {Object|String} statusInfo - Objeto con 'status_message' y 'estatus', o una cadena de mensaje.
 * @param {Boolean} [trashed=false] - Indica si el post fue movido a 'private'.
 */
function updateSheetStatus(sheet, rowIndex, headerIndices, statusInfo, trashed = false) {
  let statusMessage;
  let estatus;

  if (typeof statusInfo === 'string') {
    // Si statusInfo es una cadena, úsala como mensaje y asigna un valor predeterminado a 'estatus'
    statusMessage = statusInfo;
    estatus = 'Info'; // O el valor que prefieras
  } else {
    // Si es un objeto, extrae las propiedades
    statusMessage = statusInfo.status_message;
    estatus = statusInfo.estatus;
  }

  // Buscar el índice de la columna de 'estatus'
  const estatusColIndex = headerIndices['estatus'];
  if (estatusColIndex !== undefined && estatusColIndex >= 0) {
    sheet.getRange(rowIndex + 2, estatusColIndex + 1).setValue(estatus);
    Logger.log(`updateSheetStatus: 'estatus' actualizado a '${estatus}' para la fila ${rowIndex + 2}`);
  } else {
    Logger.log(`updateSheetStatus: No se encontró la columna 'estatus' en la hoja.`);
  }

  // Buscar el índice de la columna de 'status_message'
  const statusMessageColIndex = headerIndices['status_message'];
  if (statusMessageColIndex !== undefined && statusMessageColIndex >= 0) {
    sheet.getRange(rowIndex + 2, statusMessageColIndex + 1).setValue(statusMessage);
    Logger.log(`updateSheetStatus: 'status_message' actualizado a '${statusMessage}' para la fila ${rowIndex + 2}`);
  } else {
    Logger.log(`updateSheetStatus: No se encontró la columna 'status_message' en la hoja.`);
  }

  // Actualizar 'OrdenStatusAnterior'
  const lastOrdenStatusColIndex = headerIndices['OrdenStatusAnterior'];
  if (lastOrdenStatusColIndex !== undefined && lastOrdenStatusColIndex >= 0) {
    const currentStatusColIndex = headerIndices['OrdenStatus'];
    if (currentStatusColIndex === undefined) {
      Logger.log(`updateSheetStatus: No se encontró la columna 'OrdenStatus' para actualizar 'OrdenStatusAnterior'.`);
    } else {
      const currentStatus = sheet.getRange(rowIndex + 2, currentStatusColIndex + 1).getValue();
      sheet.getRange(rowIndex + 2, lastOrdenStatusColIndex + 1).setValue(currentStatus);
      Logger.log(`updateSheetStatus: 'OrdenStatusAnterior' actualizado a '${currentStatus}' para la fila ${rowIndex + 2}`);
    }
  } else {
    Logger.log(`updateSheetStatus: No se encontró la columna 'OrdenStatusAnterior' en la hoja.`);
  }

  // No se modifica el estado del post en WordPress según las condiciones
  // La marca 'Vendido' ya se maneja en el campo meta
}

/**
 * Actualiza el tiempo de última sincronización para una fila.
 * @param {Sheet} sheet - Hoja de cálculo activa.
 * @param {Number} rowIndex - Índice de la fila (0-based).
 * @param {Object} headerIndices - Mapeo de nombres internos de columnas a índices.
 */
function updateLastSyncTime(sheet, rowIndex, headerIndices) {
  const lastSyncColIndex = headerIndices['last_sync_time'];
  if (lastSyncColIndex !== undefined && lastSyncColIndex >= 0) {
    const now = new Date();
    sheet.getRange(rowIndex + 2, lastSyncColIndex + 1).setValue(now);
    Logger.log(`updateLastSyncTime: 'last_sync_time' actualizado a '${now}' para la fila ${rowIndex + 2}.`);
  } else {
    Logger.log(`updateLastSyncTime: No se encontró la columna 'last_sync_time' en la hoja.`);
  }
}

/**
 * Registra un resumen de los posts procesados.
 */
function logPostStats() {
  Logger.log(`Resumen de Publicaciones Procesadas:`);
  Logger.log(`Publicaciones Ignoradas: ${postStats.ignored}`);
  Logger.log(`Publicaciones Actualizadas: ${postStats.updated}`);
  Logger.log(`Publicaciones Movidas a 'private': ${postStats.trashed}`);
  Logger.log(`Publicaciones Creadas: ${postStats.created}`);
  Logger.log(`Publicaciones Fallidas: ${postStats.failed}`);
}

/**
 * Resetea los contadores de estadísticas de posts procesados.
 */
function resetPostStats() {
  postStats = { ignored: 0, updated: 0, trashed: 0, created: 0, failed: 0 };
  Logger.log('resetPostStats: Contadores de estadísticas reseteados.');
}

// ================================================
// Triggers para Capturar Cambios en la Hoja de Cálculo
// ================================================

/**
 * Trigger que se ejecuta cada vez que se edita la hoja de cálculo.
 * Verifica si el campo 'OrdenStatus' cambia de 'comprado' a 'historico' y realiza una actualización.
 * @param {Object} e - Objeto de evento que contiene información sobre la edición.
 */
function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();

    // Verificar que sea la hoja correcta
    if (sheet.getName() !== SHEET_NAME) return;

    // Obtener la fila y columna editada
    const row = range.getRow();
    const column = range.getColumn();

    // Obtener los encabezados para identificar la columna de 'OrdenStatus' y 'OrdenStatusAnterior'
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerIndices = getColumnIndices(headers);
    const ordenStatusColIndex = headerIndices['OrdenStatus']; // Índice de 'OrdenStatus'
    const lastOrdenStatusColIndex = headerIndices['OrdenStatusAnterior']; // Índice de 'OrdenStatusAnterior'

    if (column - 1 !== ordenStatusColIndex) return; // Solo interesa cambios en 'OrdenStatus'

    // Obtener el nuevo valor de 'OrdenStatus'
    const newStatus = range.getValue().toString().trim().toLowerCase();

    // Obtener el valor anterior de 'OrdenStatusAnterior'
    let previousStatus = '';
    if (lastOrdenStatusColIndex !== undefined && lastOrdenStatusColIndex >= 0) {
      previousStatus = sheet.getRange(row, lastOrdenStatusColIndex + 1).getValue().toString().trim().toLowerCase();
    }

    // Solo procesar si el estado cambia de 'comprado' a 'historico'
    if (newStatus === 'historico' && previousStatus === 'comprado') {
      const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
      const mappedRow = getRowData(rowData, headerIndices);

      const ordencompra = mappedRow.OrdenCompra;
      if (ordencompra && ordencompra.trim() !== '') {
        const existingPostId = findPostByOrdenCompra(ordencompra);
        if (existingPostId) {
          // Actualizar el campo 'Vendido' en el meta
          updateVendidoField(existingPostId, true);
          Logger.log(`onEdit: Post ID ${existingPostId} marcado como 'Vendido' debido a cambio de OrdenStatus a 'historico'.`);
          
          // Actualizar mensaje de estado
          updateSheetStatus(sheet, row - 1, headerIndices, {
            status_message: 'Vendido',
            estatus: 'Success'
          }, true);
        } else {
          Logger.log(`onEdit: No se encontró ningún post para OrdenCompra: ${ordencompra}`);
        }
      } else {
        Logger.log(`onEdit: 'OrdenCompra' está vacío. No se puede marcar como 'Vendido'.`);
      }

      // Actualizar 'OrdenStatusAnterior' al nuevo estado
      if (lastOrdenStatusColIndex !== undefined && lastOrdenStatusColIndex >= 0) {
        sheet.getRange(row, lastOrdenStatusColIndex + 1).setValue('historico');
        Logger.log(`onEdit: 'OrdenStatusAnterior' actualizado a 'historico' para la fila ${row}`);
      }

    } else if (newStatus === 'comprado') {
      // Actualizar 'OrdenStatusAnterior' al nuevo estado
      if (lastOrdenStatusColIndex !== undefined && lastOrdenStatusColIndex >= 0) {
        sheet.getRange(row, lastOrdenStatusColIndex + 1).setValue('comprado');
        Logger.log(`onEdit: 'OrdenStatusAnterior' actualizado a 'comprado' para la fila ${row}`);
      }
    }

  } catch (error) {
    Logger.log(`onEdit: Error al procesar el cambio en 'OrdenStatus': ${error.message}`);
  }
}

/**
 * Actualiza el campo 'Vendido' en el meta de una publicación en WordPress.
 * @param {String} postId - ID de la publicación en WordPress como cadena.
 * @param {Boolean} vendido - Valor a asignar a 'Vendido'.
 */
function updateVendidoField(postId, vendido) {
  try {
    const updateData = {
      meta: {
        'Vendido': vendido.toString()
      }
    };
    wpApiRequest('POST', `${WP_CUSTOM_AUTOS_ENDPOINT}/${postId}`, updateData);
    Logger.log(`updateVendidoField: 'Vendido' actualizado a '${vendido}' para el post ID ${postId}`);
  } catch (error) {
    Logger.log(`updateVendidoField: Error al actualizar 'Vendido' para el post ID ${postId}: ${error.message}`);
  }
}

/**
 * Trigger que se ejecuta cuando hay cambios en la hoja de cálculo, incluyendo actualizaciones impulsadas por fórmulas.
 * @param {Object} e - Objeto de evento que contiene información sobre el cambio.
 */
function onChange(e) {
  try {
    const ss = e.source; // Objeto Spreadsheet
    const sheet = ss.getSheetByName(SHEET_NAME); // Nombre de la hoja objetivo
    if (!sheet) return;

    // Obtener el rango del cambio
    const changeRange = e.range;
    if (!changeRange) return; // Si no hay rango, salir

    // Obtener la fila y columna cambiadas
    const row = changeRange.getRow();
    const col = changeRange.getColumn();

    // Obtener los encabezados para mapear columnas
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerIndices = getColumnIndices(headers);

    // Identificar la columna modificada
    const internalKey = Object.keys(headerIndices).find(key => headerIndices[key] === col - 1);
    if (!internalKey) return; // Si la columna modificada no está mapeada, salir

    Logger.log(`onChange: Columna modificada '${internalKey}' en la fila ${row}`);

    // Procesar la fila actual
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const mappedRow = getRowData(rowData, headerIndices);

    // Obtener el post_id si existe
    const postId = mappedRow.post_id ? String(mappedRow.post_id) : null;
    processRow(mappedRow, postId || null, sheet, row - 1, headerIndices);

  } catch (error) {
    Logger.log(`onChange: Error al procesar el cambio en la hoja: ${error.message}`);
  }
}

// ================================================
// Funciones de Inicialización y Configuración
// ================================================

/**
 * Inicializa la caché de términos al cargar la hoja por primera vez.
 * Este método puede ser llamado manualmente si es necesario.
 */
function initializeCache() {
  initializeTermCache();
  Logger.log('initializeCache: Caché de términos inicializada.');
}

// ================================================
// Triggers de Instalación
// ================================================

/**
 * Configura los triggers necesarios para el script.
 * Este método debe ser ejecutado una vez para configurar los triggers.
 */
function setupTriggers() {
  const existingTriggers = ScriptApp.getProjectTriggers();
  const triggerNames = existingTriggers.map(trigger => trigger.getHandlerFunction());

  if (!triggerNames.includes('processSheet')) {
    ScriptApp.newTrigger('processSheet')
      .timeBased()
      .everyMinutes(10)
      .create();
    Logger.log('setupTriggers: Trigger para processSheet creado.');
  }

  if (!triggerNames.includes('onEdit')) {
    ScriptApp.newTrigger('onEdit')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onEdit()
      .create();
    Logger.log('setupTriggers: Trigger para onEdit creado.');
  }

  if (!triggerNames.includes('onChange')) {
    ScriptApp.newTrigger('onChange')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onChange()
      .create();
    Logger.log('setupTriggers: Trigger para onChange creado.');
  }

  Logger.log('setupTriggers: Triggers configurados exitosamente.');
}

// ================================================
// API REST: Función para Desplegar como Web App
// ================================================

/**
 * Función para desplegar como Aplicación Web y manejar solicitudes GET.
 * Retorna los datos de la hoja de cálculo en formato JSON filtrados por OrdenStatus = "comprado".
 * @param {Object} e - Objeto de evento que contiene los parámetros de la solicitud.
 * @return {ContentService.Output} Respuesta en formato JSON.
 */
function doGet(e) {
  try {
    // Obtener parámetros de filtrado (si existen)
    const ordencompra = e.parameter.ordencompra ? e.parameter.ordencompra.trim() : null;
    
    // Acceder a la hoja de cálculo
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: `La hoja '${SHEET_NAME}' no existe.` }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const dataRange = sheet.getDataRange();
    const data = dataRange.getDisplayValues(); // Usar getDisplayValues() para evitar problemas con formatos
    const headers = data.shift(); // Eliminar los encabezados del array de datos
    const headerIndices = getColumnIndices(headers);
    
    // Mapeo de encabezados para obtener los datos
    let mappedData = data.map(row => getRowData(row, headerIndices));
    
    // Filtrar por 'OrdenStatus' = 'comprado'
    mappedData = mappedData.filter(row => row.OrdenStatus && row.OrdenStatus.toString().toLowerCase() === 'comprado');
    
    // Filtrar por 'OrdenCompra' si se proporciona
    if (ordencompra) {
      mappedData = mappedData.filter(row => row.OrdenCompra === ordencompra);
      if (mappedData.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({ error: `No se encontraron datos para OrdenCompra: ${ordencompra}` }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Retornar los datos en formato JSON
    return ContentService.createTextOutput(JSON.stringify(mappedData))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
