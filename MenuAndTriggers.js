// ================================================
// Funciones de Menú Personalizado y Triggers
// ================================================

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Sync WordPress')
      .addItem('Iniciar Procesamiento Manual', 'promptManualStart')
      .addItem('Limpiar Inicio Manual', 'clearManualStartRow')
      .addItem('Ejecutar Procesamiento Manualmente', 'runManualSync')
      .addToUi();
  }
  
  /**
   * Solicita al usuario ingresar la fila desde la cual comenzar el procesamiento manual.
   */
  function promptManualStart() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt('Iniciar Procesamiento Manual', 'Ingresa el número de fila desde donde deseas comenzar:', ui.ButtonSet.OK_CANCEL);
  
    if (response.getSelectedButton() === ui.Button.OK) {
      const input = response.getResponseText();
      const rowNumber = parseInt(input, 10);
      if (isNaN(rowNumber) || rowNumber < 2) { // Asumiendo que la fila 1 son encabezados
        ui.alert('Por favor, ingresa un número de fila válido (>= 2).');
      } else {
        setManualStartRow(rowNumber);
        ui.alert(`Procesamiento manual iniciado desde la fila ${rowNumber}. Ejecuta "Ejecutar Procesamiento Manualmente" para procesar.`);
      }
    } else {
      ui.alert('Proceso cancelado.');
    }
  }
  
  /**
   * Establece la fila de inicio manual en las propiedades del script.
   * @param {Number} rowNumber - Número de fila desde donde comenzar.
   */
  function setManualStartRow(rowNumber) {
    scriptProperties.setProperty(MANUAL_START_ROW_PROP, rowNumber.toString());
    Logger.log(`setManualStartRow: MANUAL_START_ROW establecido en ${rowNumber}`);
  }
  
  function clearManualStartRow() {
    scriptProperties.deleteProperty(MANUAL_START_ROW_PROP);
    Logger.log('clearManualStartRow: MANUAL_START_ROW ha sido limpiado.');
    const ui = SpreadsheetApp.getUi();
    ui.alert('Inicio manual limpiado. El script volverá a procesar basado en la lógica de tiempo.');
  }
  
  /**
   * Ejecuta el procesamiento manual desde la fila especificada.
   */
  function runManualSync() {
    const manualStartRow = scriptProperties.getProperty(MANUAL_START_ROW_PROP);
    if (!manualStartRow) {
      const ui = SpreadsheetApp.getUi();
      ui.alert('No se ha establecido una fila de inicio manual. Por favor, usa "Iniciar Procesamiento Manual" primero.');
      return;
    }
  
    Logger.log(`runManualSync: Ejecutando syncWordPress desde la fila ${manualStartRow}`);
    syncWordPress();
  }