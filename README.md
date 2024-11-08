Este repositorio contiene los archivos privados para conectar Google Sheets con Trefa.mx

Versión beta 0.9.1


***Funcionamiento***

**Condisiones de Actualización**

	•	isUpdatedAfterLastSync: La fila se procesará solo si ha sido modificada después de la última sincronización.
	•	isComprado: La fila se procesará si ordenstatus es 'Comprado'.
	•	isHistoricoWithPost: Si ordenstatus es 'Historico' y existe un post_id (es decir, el post ya existe en WordPress), la fila se procesará para actualizar el estado del post.
	•	Condición de retorno: La función devuelve true si ambas condiciones se cumplen: la fila ha sido modificada después de la última sincronización y ordenstatus es 'Comprado' o 'Historico' con un post_id existente.

	1.	El script solo procesa filas donde OrdenStatus es igual a Comprado.
	2.	Si una fila con OrdenStatus igual a Comprado y con un post_id existente ahora tiene OrdenStatus igual a Historico, el estado del post cambia a trash.
	3.	Para crear nuevos posts, el script busca posts existentes con el ordencompra de la fila para evitar duplicados. Si existe, se actualiza el post con ese ordencompra en lugar de crear uno nuevo.
	4.	Si no hay un post con el ordencompra de la fila que se está procesando, entonces se crea un nuevo post y se establece su estado en publish.
    

**Detalles Adicionales**

	•	Control de Actualizaciones Basado en Fechas:
	•	El script solo procesa filas que han sido modificadas desde la última sincronización, comparando ultimamodificacion con last_sync_time.
	•	Esto evita procesar filas que no han cambiado, optimizando la ejecución del script.
	•	Manejo de Relaciones y Taxonomías:
	•	El script maneja la creación y actualización de términos (taxonomías) para Marca, Modelo, Sucursal y Clasificación.
	•	Establece relaciones entre el Auto (post), la Marca y el Modelo, y también con la Sucursal si corresponde.
	•	Optimización de Imágenes:
	•	Las imágenes se optimizan y se suben a WordPress, evitando reprocesarlas si ya existen los IDs en la hoja de cálculo.
	•	Actualización Condicional de Posts:
	•	Solo se actualizan los campos que han cambiado, comparando los datos nuevos con los existentes en WordPress.
	•	Esto se logra a través de la función getUpdatedFields.

**Posibles Escenarios**

	•	Si una fila con OrdenStatus distinto de 'Comprado' o 'Historico':
	•	El script no procesará esta fila, incluso si ha sido modificada recientemente.
	•	Si un post con OrdenStatus 'Comprado' cambia a 'Historico':
	•	El script actualizará el post existente en WordPress, cambiando su estado a 'trash'.
	•	Si un post con OrdenStatus 'Historico' cambia a 'Comprado':
	•	El script actualizará el post existente en WordPress, cambiando su estado a 'publish'.
	•	Si se modifica una fila con OrdenStatus 'Comprado' y no existe un post_id ni un post con ese ordencompra:
	•	El script creará un nuevo post en WordPress con estado 'publish'.

Recomendaciones

	Verificar los Datos en la Hoja de Cálculo:
	•	Asegurar de que los campos clave como ordencompra, ordenstatus, y ultimamodificacion estén correctamente llenados y actualizados.
	•	Mantener la Consistencia de los Estados:
	•	Monitorear los Logs y Errores:
	    Revisa los logs generados por el script para identificar cualquier problema o excepción que pueda ocurrir durante la ejecución.
	•	Realizar Pruebas Controladas