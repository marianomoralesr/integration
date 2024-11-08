// ================================================
// Funciones de Interacción con la API de WordPress
// ================================================

/**
 * Obtiene el token JWT para autenticar las solicitudes a WordPress.
 * @return {String|null} Token JWT si se obtiene exitosamente, de lo contrario null.
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
      return jsonResponse.data.token; // Aseguramos usar .data.token
    } else {
      Logger.log('getJwtToken: Fallo al obtener el token JWT. Respuesta: ' + responseText);
    }
  } catch (error) {
    Logger.log('getJwtToken: Error al obtener el token JWT: ' + error.message);
  }
  return null;
}

/**
 * Función genérica para realizar solicitudes a la API de WordPress.
 * @param {String} method - Método HTTP (GET, POST, etc.).
 * @param {String} endpoint - URL del endpoint de la API.
 * @param {Object} data - Datos a enviar en el cuerpo de la solicitud (si aplica).
 * @param {String} jwtToken - Token JWT para autenticación.
 * @return {Object} Respuesta de la solicitud parseada como objeto.
 */
function wpApiRequest(method, endpoint, data, jwtToken) {
  const options = {
    method: method,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true
  };
  if (data) {
    options.payload = JSON.stringify(data);
  }
  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 400) {
      Logger.log(`wpApiRequest: Error en la solicitud a ${endpoint}: ${responseText}`);
      throw new Error(`Error en la solicitud a ${endpoint}: ${responseText}`);
    }

    if (!responseText) {
      Logger.log(`wpApiRequest: Respuesta vacía de la solicitud a ${endpoint}`);
      throw new Error(`Respuesta vacía de la solicitud a ${endpoint}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      Logger.log(`wpApiRequest: Error al parsear JSON de la respuesta de ${endpoint}: ${e.message}`);
      throw new Error(`Error al parsear JSON de la respuesta de ${endpoint}: ${e.message}`);
    }
  } catch (error) {
    Logger.log(`wpApiRequest: Error en wpApiRequest: ${error.message}`);
    throw error;
  }
}