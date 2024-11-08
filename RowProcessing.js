// ================================================
// Funciones de Procesamiento de Filas
// ================================================

/**
 * Verifica si una fila necesita ser procesada basada en 'ordenstatus' y las fechas de última modificación y sincronización.
 * Procesa la fila si ha sido modificada desde la última sincronización.
 * @param {Object} rowData - Datos de la fila.
 * @return {Boolean} True si la fila necesita ser procesada, de lo contrario false.
 */
 function rowNeedsProcessing(rowData) {
    const lastUpdateDate = new Date(rowData['ultimamodificacion']);
    const lastSyncTime = rowData['last_sync_time'] ? new Date(rowData['last_sync_time']) : new Date(0);
  
    // Procesar si la fecha de última modificación es posterior a la fecha de última sincronización
    const isUpdatedAfterLastSync = lastUpdateDate > lastSyncTime;
  
    // Además, verificar que 'ordenstatus' es "Comprado" o "Historico" con post_id
    const currentStatus = rowData['ordenstatus'];
    const isComprado = currentStatus === 'Comprado';
    const isHistoricoWithPost = currentStatus === 'Historico' && rowData['post_id'];
  
    return isUpdatedAfterLastSync && (isComprado || isHistoricoWithPost);
  }
  
  /**
   * Prepara los datos del post para enviar a WordPress.
   * @param {Object} rowData - Datos de la fila.
   * @param {Number} makeId - ID de la Marca (make).
   * @param {Number} modelId - ID del Modelo (model).
   * @param {Number} sucursalId - ID de la Sucursal.
   * @param {Number} clasificacionId - ID de la Clasificación.
   * @param {String} jwtToken - Token JWT para autenticación.
   * @param {Sheet} sheet - Hoja de cálculo activa.
   * @param {Number} rowIndex - Índice de la fila actual.
   * @param {Object} headerIndices - Mapeo de nombres de columnas a índices.
   * @return {Object} Objeto con los datos del post preparados.
   */
  function preparePostData(rowData, makeId, modelId, sucursalId, clasificacionId, jwtToken, sheet, rowIndex, headerIndices) {
    Logger.log(`preparePostData: Iniciando con automarca: '${rowData.automarca}', autosubmarcaversion: '${rowData.autosubmarcaversion}'`);
  
    // Procesa las URLs de las fotos exteriores e interiores como arrays de URLs
    const fotosExteriorArray = typeof rowData.fotos_exterior === 'string' ? rowData.fotos_exterior.split(',').map(url => url.trim()) : [];
    const fotosInteriorArray = typeof rowData.fotos_interior === 'string' ? rowData.fotos_interior.split(',').map(url => url.trim()) : [];
  
    // Subir la imagen destacada y obtener su ID
    let featuredImageId = null;
    if (rowData.featured_image_id) {
      // Si ya tenemos el ID de la imagen destacada, lo usamos
      featuredImageId = rowData.featured_image_id;
      Logger.log(`preparePostData: Usando featured_image_id existente: ${featuredImageId}`);
    } else if (rowData.fotooficial) {
      Utilities.sleep(1000); // Pausa de 1 segundo
      featuredImageId = optimizeAndRenameImage(rowData.fotooficial, `${rowData.automarca} ${rowData.autosubmarcaversion} Oficial`, jwtToken);
      if (featuredImageId) {
        // Guardar el ID en la hoja de cálculo
        sheet.getRange(rowIndex + 2, headerIndices['featured_image_id'] + 1).setValue(featuredImageId);
      }
    }
  
    // Procesar fotos exterior
    let fotosExteriorIds = [];
    if (rowData.fotos_exterior_ids) {
      // Si ya tenemos los IDs de las fotos exterior, los usamos
      fotosExteriorIds = rowData.fotos_exterior_ids.split(',').map(id => id.trim());
      Logger.log(`preparePostData: Usando fotos_exterior_ids existentes: ${fotosExteriorIds}`);
    } else {
      fotosExteriorIds = fotosExteriorArray.map(url => {
        Utilities.sleep(1000); // Pausa de 1 segundo
        return optimizeAndRenameImage(url, `${rowData.automarca} ${rowData.autosubmarcaversion} Exterior`, jwtToken);
      }).filter(id => id !== null);
      if (fotosExteriorIds.length > 0) {
        // Guardar los IDs en la hoja de cálculo
        sheet.getRange(rowIndex + 2, headerIndices['fotos_exterior_ids'] + 1).setValue(fotosExteriorIds.join(','));
      }
    }
  
    // Procesar fotos interior
    let fotosInteriorIds = [];
    if (rowData.fotos_interior_ids) {
      // Si ya tenemos los IDs de las fotos interior, los usamos
      fotosInteriorIds = rowData.fotos_interior_ids.split(',').map(id => id.trim());
      Logger.log(`preparePostData: Usando fotos_interior_ids existentes: ${fotosInteriorIds}`);
    } else {
      fotosInteriorIds = fotosInteriorArray.map(url => {
        Utilities.sleep(1000); // Pausa de 1 segundo
        return optimizeAndRenameImage(url, `${rowData.automarca} ${rowData.autosubmarcaversion} Interior`, jwtToken);
      }).filter(id => id !== null);
      if (fotosInteriorIds.length > 0) {
        // Guardar los IDs en la hoja de cálculo
        sheet.getRange(rowIndex + 2, headerIndices['fotos_interior_ids'] + 1).setValue(fotosInteriorIds.join(','));
      }
    }
  
    // Construir el título incluyendo AutoAno
    const title = `${rowData.automarca} ${rowData.autosubmarcaversion} ${rowData.autoano}`;
  
    // Construir el campo meta 'titulo' sin incluir AutoAno
    const tituloMeta = `${rowData.automarca} ${rowData.autosubmarcaversion}`;
  
    return {
      title: title,
      content: rowData.metadescripcion || `Detalles para ${title}`,
      status: 'publish', // Por defecto 'publish', puede ser actualizado en processRow
      featured_media: featuredImageId,
      meta: {
        'ordenstatus': String(rowData['ordenstatus']),
        'ordencompra': String(rowData['ordencompra']),
        'ordenid': String(rowData['ordenid']),
        'autoano': String(rowData['autoano']),
        'autoprecio': String(rowData['autoprecio']),
        'autokilometraje': String(rowData['autokilometraje']),
        'automotor': String(rowData['automotor']),
        'autocombustible': String(rowData['autocombustible']),
        'autotransmision': String(rowData['autotransmision']),
        'autocilindros': String(rowData['autocilindros']),
        'color_exterior': String(rowData['colorexterior']),
        'color_interior': String(rowData['colorinterior']),
        'autogarantia': String(rowData['autogarantia']),
        'detalles_esteticos': String(rowData['detallesesteticos']),
        'monto_separacion': String(rowData['montoseparacion']),
        'enganche': String(rowData['enganchemin']),
        'plazo': String(rowData['plazo']),
        'nosiniestros': String(rowData['nosiniestros']),
        'mensualidad': String(rowData['mensualidad']),
        'fotooficial': String(rowData['fotooficial']),
        'proximamente': String(rowData['proximamente']),
        'separado': String(rowData['separado']),
        'titulo': tituloMeta, // Campo meta adicional para uso en ciertas secciones
        'fotos_exterior': fotosExteriorIds, // IDs de las imágenes exteriores
        'fotos_interior': fotosInteriorIds  // IDs de las imágenes interiores
      },
      taxonomies: {
        'makes': [makeId],
        'models': [modelId],
        'clasificacionid': clasificacionId ? [clasificacionId] : [],
        'sucursal': sucursalId ? [sucursalId] : []
      },
    };
  }
  
  /**
   * Procesa una fila específica, ya sea creando o actualizando un post en WordPress.
   * Solo actualiza los campos que han cambiado.
   * @param {Object} rowData - Datos de la fila.
   * @param {Number} postId - ID del post existente en WordPress (si aplica).
   * @param {String} jwtToken - Token JWT para autenticación.
   * @param {Sheet} sheet - Hoja de cálculo activa.
   * @param {Number} rowIndex - Índice de la fila actual.
   * @param {Object} headerIndices - Mapeo de nombres de columnas a índices.
   */
  function processRow(rowData, postId, jwtToken, sheet, rowIndex, headerIndices) {
    try {
      // Obtener IDs de make, model, sucursal, clasificacionid
      const makeId = getTermId('makes', rowData.automarca, jwtToken);
      const modelId = getTermId('models', rowData.autosubmarcaversion, jwtToken);
      const sucursalId = getTermId('sucursal', rowData.sucursal, jwtToken);
      const clasificacionId = getTermId('clasificacionid', rowData.clasificacionid, jwtToken);
  
      // Verificar que tenemos IDs válidos
      if (!makeId || !modelId) {
        throw new Error(`processRow: IDs de términos inválidos para marca o modelo en la fila con ordenID ${rowData.ordenid}`);
      }
  
      // Prepara los datos del post
      const postData = preparePostData(rowData, makeId, modelId, sucursalId, clasificacionId, jwtToken, sheet, rowIndex, headerIndices);
  
      // Determina el estado del post basado en 'ordenstatus'
      if (rowData['ordenstatus'] === 'Historico' && postId) {
        postData['status'] = 'trash'; // Actualiza el estado del post a "trash" si 'ordenstatus' es "Historico"
        Logger.log(`processRow: Configurando estado a 'trash' para postId: ${postId}`);
      } else if (rowData['ordenstatus'] === 'Comprado') {
        postData['status'] = 'publish'; // Publica el post si 'ordenstatus' es "Comprado"
        Logger.log(`processRow: Configurando estado a 'publish' para postId: ${postId || 'nuevo'}`);
      } else {
        // No loggear información sobre filas no elegibles
        return;
      }
  
      let response;
      if (postId) {
        // Obtener datos existentes del post
        const existingData = getExistingPostData(postId, jwtToken);
        if (!existingData) {
          throw new Error(`No se pudieron obtener los datos existentes del post ID ${postId}`);
        }
  
        // Comparar y obtener los campos modificados
        const updatedFields = getUpdatedFields(postData, existingData);
  
        if (Object.keys(updatedFields).length === 0) {
          Logger.log(`processRow: No hay cambios para actualizar en el post ID ${postId}`);
          // Actualizar la fecha de sincronización en la hoja
          updateLastSyncTime(sheet, rowIndex, headerIndices);
          return;
        }
  
        // Actualizar solo los campos modificados
        Logger.log(`processRow: Actualizando post existente con ID ${postId}`);
        const updateUrl = `${WP_CUSTOM_AUTOS_ENDPOINT}/${postId}`;
        response = wpApiRequest('POST', updateUrl, updatedFields, jwtToken);
        Logger.log(`processRow: Post actualizado con ID ${postId}`);
      } else {
        // Crea un nuevo post
        Logger.log(`processRow: Creando un nuevo post`);
        response = wpApiRequest('POST', WP_CUSTOM_AUTOS_ENDPOINT, postData, jwtToken);
        postId = response.id;
        Logger.log(`processRow: Nuevo post creado con ID ${postId}`);
      }
  
      // Gestiona las relaciones después de crear o actualizar el post
      manageRelations(postId, makeId, modelId, sucursalId, jwtToken);
  
      // Mensaje de estatus basado en la acción realizada
      const estatusMessage = postData['status'] === 'trash' ? 'Actualizado a Historico.' : 'Éxito: Auto publicado/actualizado.';
      updateSheetStatus(sheet, rowIndex, headerIndices, estatusMessage, postId);
  
      // Actualizar la fecha de sincronización en la hoja
      updateLastSyncTime(sheet, rowIndex, headerIndices);
    } catch (error) {
      Logger.log(`processRow: Error procesando fila ${rowIndex + 2}: ${error.message}`);
      updateSheetStatus(sheet, rowIndex, headerIndices, 'Error: ' + error.message, null);
    }
  }