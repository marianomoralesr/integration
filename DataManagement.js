// ================================================
// Funciones de Gestión de Datos de WordPress
// ================================================

/**
 * Busca una publicación existente en WordPress por el campo 'ordencompra' usando el endpoint personalizado.
 * @param {String} ordencompra - Valor de 'ordencompra' para buscar.
 * @return {Number|null} ID de la publicación si existe, de lo contrario null.
 */
 function findPostByOrdenCompra(ordencompra) {
    const searchUrl = `${WP_CUSTOM_AUTOS_ENDPOINT}?ordencompra=${encodeURIComponent(ordencompra)}`;
  
    try {
      const posts = wpApiRequest('GET', searchUrl, null);
      if (Array.isArray(posts) && posts.length > 0) {
        Logger.log(`findPostByOrdenCompra: Publicación encontrada con ordencompra '${ordencompra}': ID ${posts[0].id}`);
        return posts[0].id;
      } else {
        Logger.log(`findPostByOrdenCompra: No se encontró ninguna publicación con ordencompra '${ordencompra}'.`);
        return null;
      }
    } catch (error) {
      Logger.log(`findPostByOrdenCompra: Error al buscar publicación por ordencompra '${ordencompra}': ${error.message}`);
      return null;
    }
  }
  
  /**
   * Crea o obtiene el ID de un término en una taxonomía.
   * @param {String} termName - Nombre del término.
   * @param {String} taxonomy - Nombre de la taxonomía.
   * @param {Number|null} parent - ID del término padre (si aplica).
   * @return {Number|null} ID del término si se encuentra o crea exitosamente, de lo contrario null.
   */
  function createTermAndGetId(termName, taxonomy, parent = null) {
    if (typeof termName !== 'string' || termName.trim() === '') {
      Logger.log(`createTermAndGetId: termName no es una cadena válida o está vacío: ${termName}`);
      return null;
    }
  
    const sanitizedTermName = termName.replace(/\//g, '-').trim();
    const slug = generateSlug(sanitizedTermName);
    const searchUrl = `${WP_TAXONOMIES_BASE}/${taxonomy}?slug=${encodeURIComponent(slug)}`;
  
    try {
      Logger.log(`createTermAndGetId: Buscando término '${termName}' en taxonomía '${taxonomy}' con slug '${slug}'`);
      // Busca si el término ya existe por slug
      const terms = wpApiRequest('GET', searchUrl, null);
  
      if (Array.isArray(terms) && terms.length > 0) {
        Logger.log(`createTermAndGetId: Término encontrado: ${terms[0].name} con ID ${terms[0].id}`);
        return terms[0].id;
      }
  
      // Si el término no existe, lo crea
      const createPayload = { name: termName, slug: slug };
      if (parent) {
        createPayload.parent = parent;
        Logger.log(`createTermAndGetId: Asignando parent_id: ${parent} al término '${termName}'`);
      }
      Logger.log(`createTermAndGetId: Creando término '${termName}' en taxonomía '${taxonomy}'`);
      const createdTerm = wpApiRequest('POST', `${WP_TAXONOMIES_BASE}/${taxonomy}`, createPayload);
      if (createdTerm && createdTerm.id) {
        Logger.log(`createTermAndGetId: Término creado: ${createdTerm.name} con ID ${createdTerm.id}`);
        return createdTerm.id;
      } else {
        Logger.log(`createTermAndGetId: Respuesta inválida al crear término '${termName}'`);
        return null;
      }
    } catch (error) {
      Logger.log(`createTermAndGetId: Error al encontrar o crear término '${termName}' en taxonomía '${taxonomy}': ${error.message}`);
      return null;
    }
  }
  
  /**
   * Obtiene el ID de un término existente en una taxonomía basándose en su nombre.
   * @param {String} taxonomy - Nombre de la taxonomía.
   * @param {String} termName - Nombre del término.
   * @return {Number|null} ID del término si existe, de lo contrario null.
   */
  function getTermId(taxonomy, termName) {
    Logger.log(`getTermId: Buscando término '${termName}' en la taxonomía '${taxonomy}'`);
    const termId = createTermAndGetId(termName, taxonomy);
    if (termId) {
      Logger.log(`getTermId: Término obtenido con ID ${termId}`);
      return termId;
    } else {
      Logger.log(`getTermId: No se pudo obtener o crear el término '${termName}' en la taxonomía '${taxonomy}'`);
      return null;
    }
  }
  
  /**
   * Obtiene los datos existentes de un post en WordPress.
   * @param {Number} postId - ID del post en WordPress.
   * @param {String} jwtToken - Token JWT para autenticación.
   * @return {Object|null} Datos del post si se obtiene exitosamente, de lo contrario null.
   */
  function getExistingPostData(postId, jwtToken) {
    const url = `${WP_CUSTOM_AUTOS_ENDPOINT}?id=${postId}`;
    try {
      const posts = wpApiRequest('GET', url, null, jwtToken);
      if (Array.isArray(posts) && posts.length > 0) {
        const postData = posts[0]; // Obtener el primer (y único) elemento
        Logger.log(`getExistingPostData: Datos obtenidos para el post ID ${postId}`);
        return postData;
      } else {
        Logger.log(`getExistingPostData: No se pudo obtener datos para el post ID ${postId}`);
        return null;
      }
    } catch (error) {
      Logger.log(`getExistingPostData: Error al obtener datos del post ID ${postId}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Compara los datos nuevos con los existentes y devuelve un objeto con solo los campos modificados.
   * @param {Object} newData - Datos nuevos a actualizar.
   * @param {Object} existingData - Datos existentes en WordPress.
   * @return {Object} Objeto con los campos que han cambiado.
   */
  function getUpdatedFields(newData, existingData) {
    const updatedFields = {};
  
    // Comparar campos de primer nivel (title, content, status, featured_media)
    ['title', 'content', 'status', 'featured_media'].forEach(field => {
      if (newData[field] !== undefined && newData[field] !== existingData[field]) {
        updatedFields[field] = newData[field];
      }
    });
  
    // Comparar meta campos
    if (newData.meta) {
      updatedFields.meta = {};
      for (const key in newData.meta) {
        const newValue = newData.meta[key];
        const existingValue = existingData.meta && existingData.meta[key] ? existingData.meta[key][0] : null;
        if (JSON.stringify(newValue) !== JSON.stringify(existingValue)) {
          updatedFields.meta[key] = newValue;
        }
      }
      if (Object.keys(updatedFields.meta).length === 0) {
        delete updatedFields.meta;
      }
    }
  
    // Comparar taxonomías
    if (newData.taxonomies) {
      updatedFields.taxonomies = {};
      for (const taxonomy in newData.taxonomies) {
        const newTerms = newData.taxonomies[taxonomy];
        const existingTerms = existingData.taxonomies && existingData.taxonomies[taxonomy] ? existingData.taxonomies[taxonomy] : [];
        const newTermsSorted = newTerms.slice().sort();
        const existingTermsSorted = existingTerms.slice().sort();
        if (JSON.stringify(newTermsSorted) !== JSON.stringify(existingTermsSorted)) {
          updatedFields.taxonomies[taxonomy] = newTerms;
        }
      }
      if (Object.keys(updatedFields.taxonomies).length === 0) {
        delete updatedFields.taxonomies;
      }
    }
  
    return updatedFields;
  }
  
  /**
   * Gestiona las relaciones del post (Auto) con Marca, Modelo y Sucursal, y también establece la relación entre Marca y Modelo.
   * @param {Number} postId - ID del post en WordPress.
   * @param {Number} makeId - ID de la Marca (make).
   * @param {Number} modelId - ID del Modelo (model).
   * @param {Number} sucursalId - ID de la Sucursal.
   * @param {String} jwtToken - Token JWT para autenticación.
   */
  function manageRelations(postId, makeId, modelId, sucursalId, jwtToken) {
    // Primero, establecer la relación entre Marca y Modelo
    manageMakeModelRelation(makeId, modelId, jwtToken);
  
    // Ahora, gestionar las relaciones del post (Auto) con Marca, Modelo y Sucursal
    if (makeId && modelId) {
      // Relación entre Auto y Marca
      const payloadMake = {
        parent_id: postId, // Auto es el padre en este contexto
        child_id: makeId,  // Marca es el hijo
        context: 'parent',
        store_items_type: 'replace',
        relation_id: 3 // ID de la relación para Marca y Auto (ajustar si es diferente)
      };
  
      // Relación entre Auto y Modelo
      const payloadModel = {
        parent_id: postId, // Auto es el padre en este contexto
        child_id: modelId, // Modelo es el hijo
        context: 'parent',
        store_items_type: 'replace',
        relation_id: 3 // ID de la relación para Modelo y Auto (ajustar si es diferente)
      };
  
      sendRelation(payloadMake, jwtToken, `Relación Auto ID ${postId} con Marca ID ${makeId}`);
      sendRelation(payloadModel, jwtToken, `Relación Auto ID ${postId} con Modelo ID ${modelId}`);
    } else {
      Logger.log(`manageRelations: makeId o modelId no están disponibles. makeId: ${makeId}, modelId: ${modelId}`);
    }
  
    // Gestionar la relación entre Auto y Sucursal
    if (sucursalId) {
      const payloadSucursal = {
        parent_id: sucursalId, // Sucursal es el padre
        child_id: postId,      // Auto es el hijo
        context: 'parent',
        store_items_type: 'replace',
        relation_id: 52 // ID de la relación para Sucursal y Auto
      };
  
      sendRelation(payloadSucursal, jwtToken, `Relación Sucursal ID ${sucursalId} con Auto ID ${postId}`);
    } else {
      Logger.log(`manageRelations: sucursalId no está disponible para el Auto ID ${postId}`);
    }
  }
  
  /**
   * Gestiona la relación entre Marca y Modelo.
   * @param {Number} makeId - ID de la Marca.
   * @param {Number} modelId - ID del Modelo.
   * @param {String} jwtToken - Token JWT para autenticación.
   */
  function manageMakeModelRelation(makeId, modelId, jwtToken) {
    try {
      if (!makeId || !modelId) {
        Logger.log(`manageMakeModelRelation: makeId o modelId es inválido. makeId: ${makeId}, modelId: ${modelId}`);
        return;
      }
  
      // Construir el payload para la relación
      const payload = {
        parent_id: makeId, // Marca (make) es el padre
        child_id: modelId, // Modelo (model) es el hijo
        context: 'parent', // 'parent' porque la Marca es el padre de Modelo
        store_items_type: 'replace',
        relation_id: 3 // ID de la relación en WordPress (ajustar si es diferente)
      };
  
      // Enviar la relación
      sendRelation(payload, jwtToken, `Relación Marca ID ${makeId} con Modelo ID ${modelId}`);
      Logger.log(`manageMakeModelRelation: Relación creada exitosamente entre Marca ID ${makeId} y Modelo ID ${modelId}`);
    } catch (error) {
      Logger.log(`manageMakeModelRelation: Error al crear la relación entre Marca y Modelo: ${error.message}`);
    }
  }
  
  /**
   * Envía una relación al endpoint jet-rel.
   * @param {Object} payload - Datos de la relación.
   * @param {String} jwtToken - Token JWT para autenticación.
   * @param {String} relationDescription - Descripción para el logging.
   */
  function sendRelation(payload, jwtToken, relationDescription) {
    try {
      Logger.log(`sendRelation: Enviando ${relationDescription}`);
      const endpoint = `${WP_RELATIONS_ENDPOINT}/${payload.relation_id}`;
      wpApiRequest('POST', endpoint, payload, jwtToken);
      Logger.log(`sendRelation: ${relationDescription} - Relación gestionada exitosamente.`);
    } catch (error) {
      Logger.log(`sendRelation: ${relationDescription} - Error al gestionar la relación: ${error.message}`);
    }
  }