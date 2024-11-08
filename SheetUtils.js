// ================================================
// Funciones de Utilidades para la Hoja de Cálculo
// ================================================

/**
 * Actualiza la fecha de última sincronización en la hoja de cálculo.
 * @param {Sheet} sheet - Hoja de cálculo activa.
 * @param {Number} rowIndex - Índice de la fila a actualizar.
 * @param {Object} headerIndices - Mapeo de nombres de columnas a índices.
 */
 function updateLastSyncTime(sheet, rowIndex, headerIndices) {
    const currentTime = new Date();
    sheet.getRange(rowIndex + 2, headerIndices['last_sync_time'] + 1).setValue(currentTime);
  }
  
  /**
   * Actualiza el estatus en la hoja de cálculo con un mensaje y postId.
   * @param {Sheet} sheet - Hoja de cálculo activa.
   * @param {Number} rowIndex - Índice de la fila a actualizar.
   * @param {Object} headerIndices - Mapeo de nombres de columnas a índices.
   * @param {String} estatus - Mensaje de estatus a registrar.
   * @param {Number} postId - ID del post en WordPress (si aplica).
   */
  function updateSheetStatus(sheet, rowIndex, headerIndices, estatus, postId) {
    Logger.log(`updateSheetStatus: Actualizando estatus en la fila ${rowIndex + 2} con mensaje: ${estatus}`);
    sheet.getRange(rowIndex + 2, headerIndices['estatus'] + 1).setValue(estatus);
    if (postId) sheet.getRange(rowIndex + 2, headerIndices['post_id'] + 1).setValue(postId);
  }