// ================================================
// Función Principal
// ================================================

/**
 * Función principal que sincroniza los datos con WordPress.
 */
 function syncWordPress() {
    Logger.log('syncWordPress: Iniciando sincronización con WordPress');
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const dataRange = sheet.getDataRange();
      const data = dataRange.getValues();
      const headers = data.shift(); // Elimina los encabezados del array de datos
      const headerIndices = getColumnIndices(headers);
  
      // Determina si hay una fila de inicio manual
      let manualStartRow = scriptProperties.getProperty(MANUAL_START_ROW_PROP);
      let currentRunTime = new Date(); // Marca de tiempo actual para esta ejecución
      let startIndex = 0; // Índice de la fila desde la cual comenzar (0-based)
      let processedCount = 0; // Contador de filas procesadas
  
      if (manualStartRow) {
        const startRowNumber = parseInt(manualStartRow, 10);
        if (isNaN(startRowNumber) || startRowNumber < 2) { // Asumiendo que la fila 1 son encabezados
          Logger.log(`syncWordPress: Fila de inicio manual inválida: ${manualStartRow}. Iniciando desde la primera fila de datos.`);
        } else {
          startIndex = startRowNumber - 2; // Convertir a índice 0-based y excluir encabezados
          Logger.log(`syncWordPress: Procesando manualmente desde la fila ${startRowNumber}`);
        }
      }
  
      // Obtiene el token JWT para autenticar las solicitudes a WordPress
      const jwtToken = getJwtToken();
      if (!jwtToken) throw new Error('syncWordPress: No se pudo obtener el token JWT.');
  
      // Itera sobre cada fila en el rango actual, empezando desde startIndex
      for (let rowIndex = startIndex; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        const rowData = getRowData(row, headerIndices);
  
        // Verifica si la fila necesita ser procesada
        let needsProcessing = false;
        if (manualStartRow) {
          needsProcessing = true; // En modo manual, procesamos sin verificar la fecha
        } else {
          needsProcessing = rowNeedsProcessing(rowData);
        }
  
        if (needsProcessing) {
          // Solo loggear información sobre las filas que son elegibles para ser procesadas
          Logger.log(`syncWordPress: Procesando fila ${rowIndex + 2}`);
  
          // Procesar la fila
          const ordencompra = rowData['ordencompra'];
          if (!ordencompra || typeof ordencompra !== 'string' || ordencompra.trim() === '') {
            Logger.log(`syncWordPress: Fila ${rowIndex + 2} - 'ordencompra' está vacío o inválido. Saltando.`);
            updateSheetStatus(sheet, rowIndex, headerIndices, 'Error: ordencompra vacío o inválido', null);
            continue;
          }
  
          // Busca una publicación existente por 'ordencompra'
          const existingPostId = findPostByOrdenCompra(ordencompra, jwtToken);
          const postId = existingPostId ? existingPostId : null;
  
          // Procesa la fila: crea o actualiza la publicación
          processRow(rowData, postId, jwtToken, sheet, rowIndex, headerIndices);
          processedCount++;
  
          // Verifica si ha alcanzado el límite de BATCH_SIZE
          if (processedCount >= BATCH_SIZE) {
            Logger.log(`syncWordPress: Se ha alcanzado el límite de ${BATCH_SIZE} filas procesadas.`);
            if (manualStartRow) {
              // Actualiza la fila de inicio manual para la próxima ejecución manual
              scriptProperties.setProperty(MANUAL_START_ROW_PROP, (rowIndex + 2).toString()); // Convertir a número de fila (1-based)
              Logger.log(`syncWordPress: Actualizando MANUAL_START_ROW a ${rowIndex + 2}`);
            }
            break; // Sale del bucle después de procesar BATCH_SIZE filas
          }
          // Pausa para evitar alcanzar los límites de tasa de la API
          Utilities.sleep(2000); // Pausa de 2 segundos entre cada fila procesada
        } else {
          // No loggear nada sobre las filas que no son elegibles
          continue;
        }
      }
  
      if (processedCount === 0) {
        Logger.log('syncWordPress: No se procesaron filas en esta ejecución.');
      }
    } catch (error) {
      Logger.log(`syncWordPress: Error durante la ejecución de syncWordPress: ${error.message}`);
      sendErrorEmail(error.message); // Función para enviar notificaciones por correo
    }
  }