// ================================================
// Funciones de Procesamiento y Carga de Imágenes
// ================================================

/**
 * Optimiza y convierte una imagen a WebP utilizando la API de TinyPNG, y redimensiona la imagen a un ancho máximo de 1200px.
 * @param {Blob} imageBlob - Blob de la imagen original.
 * @param {String} filename - Nombre del archivo de la imagen.
 * @param {String} title - Título para la imagen (usado para el alt text).
 * @return {Blob|null} Blob de la imagen optimizada, o null si falla.
 */
 function optimizeImageWithTinyPNG(imageBlob, filename, title) {
    const apiKey = 'TU_API_KEY_DE_TINYPNG'; // Reemplaza con tu clave de API de TinyPNG
    const url = 'https://api.tinify.com/shrink';
  
    try {
      // Paso 1: Enviar la imagen a TinyPNG para optimización
      const options = {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Utilities.base64Encode('api:' + apiKey)
        },
        contentType: 'application/octet-stream',
        payload: imageBlob.getBytes(),
        muteHttpExceptions: true
      };
  
      const response = UrlFetchApp.fetch(url, options);
      const responseData = JSON.parse(response.getContentText());
  
      if (response.getResponseCode() === 201) {
        // Paso 2: Obtener la URL de la imagen optimizada
        const optimizedImageUrl = responseData.output.url;
  
        // Paso 3: Descarga la imagen optimizada con conversión a WebP y redimensionamiento
        const resizeOptions = {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Utilities.base64Encode('api:' + apiKey),
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            resize: {
              method: 'scale',
              width: 1200
            },
            convert: {
              type: ['image/webp']
            }
          }),
          muteHttpExceptions: true
        };
  
        const optimizedImageResponse = UrlFetchApp.fetch(optimizedImageUrl, resizeOptions);
        const optimizedImageBlob = optimizedImageResponse.getBlob();
  
        // Renombrar el archivo con extensión .webp
        optimizedImageBlob.setName(filename + '.webp');
  
        return optimizedImageBlob;
      } else {
        throw new Error('Error al optimizar la imagen con TinyPNG: ' + responseData.error);
      }
    } catch (error) {
      Logger.log(`optimizeImageWithTinyPNG: Error al optimizar la imagen: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Optimiza y renombra una imagen descargada de una URL.
   * @param {String} imageUrl - URL de la imagen.
   * @param {String} title - Título para la imagen.
   * @param {String} jwtToken - Token JWT para autenticación.
   * @return {Number|null} ID de la imagen subida en WordPress, o null si falla.
   */
  function optimizeAndRenameImage(imageUrl, title, jwtToken) {
    try {
      // Descargar la imagen original
      const response = UrlFetchApp.fetch(imageUrl);
      let imageBlob = response.getBlob();
  
      // Renombrar el archivo (sin extensión, ya que será convertido a .webp)
      const sanitizedTitle = sanitizeFilename(title);
      const filename = sanitizedTitle;
  
      // Optimizar la imagen usando la API de TinyPNG
      imageBlob = optimizeImageWithTinyPNG(imageBlob, filename, title);
  
      if (imageBlob === null) {
        throw new Error('La optimización de la imagen falló.');
      }
  
      // Subir la imagen a WordPress y obtener el ID
      const imageId = uploadImageAndGetId(imageBlob, title, jwtToken);
  
      return imageId;
    } catch (error) {
      Logger.log(`optimizeAndRenameImage: Error al procesar la imagen desde '${imageUrl}': ${error.message}`);
      return null;
    }
  }
  
  /**
   * Sube una imagen a WordPress y obtiene su ID.
   * @param {Blob} imageBlob - Blob de la imagen.
   * @param {String} title - Título para la imagen.
   * @param {String} jwtToken - Token JWT para autenticación.
   * @return {Number|null} ID de la imagen subida en WordPress, o null si falla.
   */
  function uploadImageAndGetId(imageBlob, title, jwtToken) {
    if (!imageBlob) {
      Logger.log('uploadImageAndGetId: No se proporcionó un blob de imagen válido.');
      return null;
    }
  
    try {
      Logger.log(`uploadImageAndGetId: Subiendo imagen con nombre: ${imageBlob.getName()}`);
  
      // Configura las opciones de la solicitud para subir la imagen
      const options = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': imageBlob.getContentType(),
          'Content-Disposition': `attachment; filename="${imageBlob.getName()}"`
        },
        payload: imageBlob.getBytes(),
        muteHttpExceptions: true
      };
  
      // Realiza la solicitud a la API de medios de WordPress
      const response = UrlFetchApp.fetch(WP_MEDIA_ENDPOINT, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
  
      if (responseCode === 201) { // Código 201 Created
        const jsonResponse = JSON.parse(responseText);
        Logger.log(`uploadImageAndGetId: Imagen subida exitosamente con ID: ${jsonResponse.id}`);
  
        // Asignar el atributo alt a la imagen
        if (title) {
          const altText = title; // Puedes personalizar cómo generar el alt text
          const altPayload = {
            alt_text: altText
          };
          const altOptions = {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              'Content-Type': 'application/json',
            },
            payload: JSON.stringify(altPayload),
            muteHttpExceptions: true
          };
          const altResponse = UrlFetchApp.fetch(`${WP_MEDIA_ENDPOINT}/${jsonResponse.id}`, altOptions);
          const altResponseCode = altResponse.getResponseCode();
          if (altResponseCode >= 200 && altResponseCode < 300) {
            Logger.log(`uploadImageAndGetId: Atributo alt asignado correctamente a la imagen ID: ${jsonResponse.id}`);
          } else {
            Logger.log(`uploadImageAndGetId: Fallo al asignar el atributo alt. Código de respuesta: ${altResponseCode}. Respuesta: ${altResponse.getContentText()}`);
          }
        }
        return jsonResponse.id;
      } else {
        Logger.log(`uploadImageAndGetId: Fallo al subir la imagen. Código de respuesta: ${responseCode}. Respuesta: ${responseText}`);
        return null;
      }
    } catch (error) {
      Logger.log(`uploadImageAndGetId: Error al subir la imagen: ${error.message}`);
      return null;
    }
  }