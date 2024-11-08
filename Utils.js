// ================================================
// Funciones Auxiliares
// ================================================

/**
 * Obtiene los índices de las columnas basándose en los encabezados.
 * @param {Array} headers - Array de encabezados de columna.
 * @return {Object} Mapeo de nombres de columnas a índices.
 */
 function getColumnIndices(headers) {
    const indices = {};
    headers.forEach((header, index) => {
      const key = headerMapping[header.trim().toLowerCase()];
      if (key) {
        indices[key] = index;
      }
    });
    return indices;
  }
  
  /**
   * Convierte una fila de datos en un objeto con claves basadas en los encabezados.
   * @param {Array} row - Array de valores de la fila.
   * @param {Object} headerIndices - Mapeo de nombres de columnas a índices.
   * @return {Object} Objeto con los datos de la fila.
   */
  function getRowData(row, headerIndices) {
    const rowData = {};
    for (const key in headerIndices) {
      rowData[key] = row[headerIndices[key]];
    }
    return rowData;
  }
  
  /**
   * Genera un slug a partir de una cadena.
   * @param {String} text - Texto a convertir en slug.
   * @return {String} Slug generado.
   */
  function generateSlug(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Reemplaza espacios por guiones
      .replace(/[^\w\-]+/g, '')       // Elimina caracteres no alfanuméricos
      .replace(/\-\-+/g, '-')         // Reemplaza múltiples guiones por uno
      .replace(/^-+/, '')             // Elimina guiones al inicio
      .replace(/-+$/, '');            // Elimina guiones al final
  }
  
  /**
   * Sanitiza un nombre de archivo eliminando caracteres no permitidos.
   * @param {String} filename - Nombre de archivo a sanitizar.
   * @return {String} Nombre de archivo sanitizado.
   */
  function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9\-\_\.]/gi, '_');
  }
  
  /**
   * Envía un correo electrónico de error cuando ocurre un fallo crítico en el script.
   * @param {String} errorMessage - Mensaje de error a enviar.
   */
  function sendErrorEmail(errorMessage) {
    const recipient = 'mariano.morales@autostrefa.mx'; // Reemplaza con tu correo electrónico
    const subject = 'Error en la Sincronización con WordPress';
    const body = `Se ha producido el siguiente error durante la sincronización:\n\n${errorMessage}`;
    MailApp.sendEmail(recipient, subject, body);
  }