// utils/dataUtils/organizadorDatos.js

/**
 * Normaliza texto (mayúsculas/minúsculas, espacios)
 * @param {string} texto - Texto a normalizar
 * @returns {string} - Texto normalizado
 */
export const normalizarTexto = (texto) => {
    return texto ? texto.trim().toUpperCase() : '';
  };
  
  /**
   * Organiza datos por materia y estructura la información para reportes
   * @param {Set} materiasSet - Conjunto de materias únicas
   * @param {Array} grupos - Lista de grupos
   * @param {Array} todosLosEstudiantes - Lista de todos los estudiantes
   * @param {Object} estudiantesPorGrupo - Mapa de estudiantes por grupo
   * @param {Object} informesPorGrupo - Mapa de informes por grupo
   * @param {Object} rubricasPorInforme - Mapa de rúbricas por informe
   * @param {Object} calificacionesPorInforme - Mapa de calificaciones por informe
   * @param {Object} materiasPorCarreraYSemestre - Estructura de materias organizadas 
   * @param {Object} semestresPorCarrera - Estructura de semestres por carrera
   * @returns {Object} - Datos organizados por materia
   */
  export const organizarDatosPorMateria = (
    materiasSet,
    grupos,
    todosLosEstudiantes,
    estudiantesPorGrupo,
    informesPorGrupo,
    rubricasPorInforme,
    calificacionesPorInforme,
    materiasPorCarreraYSemestre,
    semestresPorCarrera
  ) => {
    const datosPorMateria = {};
    
    // Crear un mapa auxiliar para asignar estudiantes a materias que deberían estar cursando
    const materiasEstudiante = {};
    
    // Para cada carrera y semestre, registrar qué materias se imparten
    Object.keys(materiasPorCarreraYSemestre).forEach(carrera => {
      Object.keys(materiasPorCarreraYSemestre[carrera] || {}).forEach(semestre => {
        const materiasDeSemestre = Array.from(materiasPorCarreraYSemestre[carrera][semestre] || []);
        
        // Para cada estudiante de esta carrera y semestre, registrar las materias
        todosLosEstudiantes
          .filter(est => est.carrera === carrera && est.semestre === semestre)
          .forEach(estudiante => {
            if (!materiasEstudiante[estudiante.id]) {
              materiasEstudiante[estudiante.id] = [];
            }
            
            // Asignar todas las materias que se imparten en su carrera y semestre
            materiasDeSemestre.forEach(materia => {
              if (!materiasEstudiante[estudiante.id].includes(materia)) {
                materiasEstudiante[estudiante.id].push(materia);
              }
            });
          });
      });
    });
    
    // Para cada materia única, crear su estructura de datos
    materiasSet.forEach(materia => {
      datosPorMateria[materia] = {
        grupos: grupos.filter(g => normalizarTexto(g.materia) === normalizarTexto(materia)),
        carrerasSemestres: {}
      };
      
      // Obtener todas las carreras y semestres donde se imparte esta materia
      Object.keys(materiasPorCarreraYSemestre).forEach(carrera => {
        Object.keys(materiasPorCarreraYSemestre[carrera] || {}).forEach(semestre => {
          const materiasEnEsteSemestre = Array.from(materiasPorCarreraYSemestre[carrera][semestre] || []);
          
          // Verificar si la materia se imparte en este semestre (comparación insensible a mayúsculas)
          if (materiasEnEsteSemestre.some(m => normalizarTexto(m) === normalizarTexto(materia))) {
            // Inicializar la estructura para esta carrera si no existe
            if (!datosPorMateria[materia].carrerasSemestres[carrera]) {
              datosPorMateria[materia].carrerasSemestres[carrera] = {};
            }
            
            // Inicializar la estructura para este semestre
            datosPorMateria[materia].carrerasSemestres[carrera][semestre] = {
              estudiantes: [],
              aprobados: 0,
              reprobados: 0,
              pendientes: 0,
              total: 0
            };
            
            // Obtener TODOS los estudiantes de esta carrera y semestre
            const estudiantesDeCarreraYSemestre = todosLosEstudiantes.filter(
              est => est.carrera === carrera && String(est.semestre) === String(semestre)
            );
            
            // Obtener grupos de esta materia en esta carrera y semestre
            const gruposDeMateria = grupos.filter(
              g => normalizarTexto(g.materia) === normalizarTexto(materia) && 
                   g.carrera === carrera && 
                   String(g.semestre) === String(semestre)
            );
            
            // Para cada estudiante, determinar su estado en esta materia
            for (const estudiante of estudiantesDeCarreraYSemestre) {
              let grupoDelEstudiante = null;
              let informeDelEstudiante = null;
              let rubricaDelEstudiante = null;
              let calificacionDelEstudiante = null;
              let resultado = 'PENDIENTE';
              
              // Verificar si el estudiante pertenece a algún grupo de esta materia
              for (const grupo of gruposDeMateria) {
                const estudiantesDelGrupo = estudiantesPorGrupo[grupo.id] || [];
                
                if (estudiantesDelGrupo.some(est => est.id === estudiante.id)) {
                  grupoDelEstudiante = grupo;
                  
                  // Buscar si tiene informe en este grupo
                  const informesDelGrupo = informesPorGrupo[grupo.id] || [];
                  informeDelEstudiante = informesDelGrupo.find(inf => inf.estudiante_id === estudiante.id);
                  
                  // Si tiene informe, buscar su rúbrica y calificación
                  if (informeDelEstudiante) {
                    if (informeDelEstudiante.rubrica_id) {
                      rubricaDelEstudiante = rubricasPorInforme[informeDelEstudiante.id];
                    }
                    if (informeDelEstudiante.calificacion_id) {
                      calificacionDelEstudiante = calificacionesPorInforme[informeDelEstudiante.id];
                    }
                    
                    // Determinar el resultado
                    if (rubricaDelEstudiante && rubricaDelEstudiante.observaciones) {
                      resultado = rubricaDelEstudiante.observaciones;
                    }
                  }
                  
                  break; // Si encontramos el grupo, no necesitamos seguir buscando
                }
              }
              
              // Si el estudiante no está en ningún grupo pero debería estar en esta materia,
              // asignarle un grupo "Sin asignar" por defecto
              if (!grupoDelEstudiante && gruposDeMateria.length > 0) {
                grupoDelEstudiante = { 
                  nombre_proyecto: '', 
                  materia: materia,
                  id: 'sin-grupo-' + Math.random() // ID único para evitar colisiones
                };
              }
              
              // Incrementar contador según resultado
              if (resultado === 'APROBADO') {
                datosPorMateria[materia].carrerasSemestres[carrera][semestre].aprobados++;
              } else if (resultado === 'REPROBADO') {
                datosPorMateria[materia].carrerasSemestres[carrera][semestre].reprobados++;
              } else {
                datosPorMateria[materia].carrerasSemestres[carrera][semestre].pendientes++;
              }
              
              // Incrementar contador total
              datosPorMateria[materia].carrerasSemestres[carrera][semestre].total++;
              
              // Agregar estudiante con sus datos a la lista
              datosPorMateria[materia].carrerasSemestres[carrera][semestre].estudiantes.push({
                estudiante,
                grupo: grupoDelEstudiante || { nombre_proyecto: '', materia },
                informe: informeDelEstudiante,
                rubrica: rubricaDelEstudiante,
                calificacion: calificacionDelEstudiante,
                resultado
              });
            }
          }
        });
      });
    });
    
    // También crear datos para TODAS las materias
    datosPorMateria['TODAS'] = {
      grupos: grupos,
      carrerasSemestres: {}
    };
    
    // Construir la vista para TODAS las materias
    Object.keys(materiasPorCarreraYSemestre).forEach(carrera => {
      if (!datosPorMateria['TODAS'].carrerasSemestres[carrera]) {
        datosPorMateria['TODAS'].carrerasSemestres[carrera] = {};
      }
      
      Object.keys(materiasPorCarreraYSemestre[carrera] || {}).forEach(semestre => {
        if (!datosPorMateria['TODAS'].carrerasSemestres[carrera][semestre]) {
          datosPorMateria['TODAS'].carrerasSemestres[carrera][semestre] = {
            estudiantes: [],
            aprobados: 0,
            reprobados: 0,
            pendientes: 0,
            total: 0
          };
        }
        
        // Obtener todos los estudiantes de esta carrera y semestre
        const estudiantesDeEsteCarreraYSemestre = todosLosEstudiantes.filter(
          est => est.carrera === carrera && String(est.semestre) === String(semestre)
        );
        
        // Para cada estudiante, encontrar su mejor resultado en cualquier materia
        for (const estudiante of estudiantesDeEsteCarreraYSemestre) {
          let mejorGrupo = null;
          let mejorInforme = null;
          let mejorRubrica = null;
          let mejorCalificacion = null;
          let mejorResultado = 'PENDIENTE';
          
          // Revisar cada grupo al que pertenece el estudiante
          for (const grupo of grupos.filter(g => g.carrera === carrera && String(g.semestre) === String(semestre))) {
            const estudiantesDelGrupo = estudiantesPorGrupo[grupo.id] || [];
            
            if (estudiantesDelGrupo.some(est => est.id === estudiante.id)) {
              const informesDelGrupo = informesPorGrupo[grupo.id] || [];
              const informeDelEstudiante = informesDelGrupo.find(inf => inf.estudiante_id === estudiante.id);
              
              if (informeDelEstudiante) {
                const rubrica = rubricasPorInforme[informeDelEstudiante.id];
                const resultado = rubrica?.observaciones || 'PENDIENTE';
                
                // Usar el mejor resultado disponible (APROBADO > REPROBADO > PENDIENTE)
                if (mejorResultado !== 'APROBADO') {
                  if (resultado === 'APROBADO' || (resultado === 'REPROBADO' && mejorResultado === 'PENDIENTE')) {
                    mejorResultado = resultado;
                    mejorGrupo = grupo;
                    mejorInforme = informeDelEstudiante;
                    mejorRubrica = rubrica;
                    mejorCalificacion = calificacionesPorInforme[informeDelEstudiante.id];
                  }
                }
              } else if (!mejorGrupo) {
                // Si no tiene informe pero está en un grupo, guardamos referencia
                mejorGrupo = grupo;
              }
            }
          }
          
          // Si no se asignó ningún grupo, asignar uno por defecto
          if (!mejorGrupo) {
            mejorGrupo = { 
              nombre_proyecto: 'Sin asignar', 
              materia: '',
              id: 'sin-grupo-' + Math.random()
            };
          }
          
          // Actualizar contadores
          if (mejorResultado === 'APROBADO') {
            datosPorMateria['TODAS'].carrerasSemestres[carrera][semestre].aprobados++;
          } else if (mejorResultado === 'REPROBADO') {
            datosPorMateria['TODAS'].carrerasSemestres[carrera][semestre].reprobados++;
          } else {
            datosPorMateria['TODAS'].carrerasSemestres[carrera][semestre].pendientes++;
          }
          
          // Incrementar total
          datosPorMateria['TODAS'].carrerasSemestres[carrera][semestre].total++;
          
          // Agregar estudiante a la lista
          datosPorMateria['TODAS'].carrerasSemestres[carrera][semestre].estudiantes.push({
            estudiante,
            grupo: mejorGrupo,
            informe: mejorInforme,
            rubrica: mejorRubrica,
            calificacion: mejorCalificacion,
            resultado: mejorResultado
          });
        }
      });
    });
    
    return datosPorMateria;
  };
  
  /**
   * Filtra los datos según los criterios seleccionados
   * @param {Object} datosPorMateria - Datos organizados por materia
   * @param {string} materiaSeleccionada - Materia seleccionada en el filtro
   * @param {string} carreraSeleccionada - Carrera seleccionada en el filtro
   * @param {string} semestreSeleccionado - Semestre seleccionado en el filtro
   * @returns {Object} - Datos filtrados según los criterios
   */
  export const obtenerDatosFiltrados = (
    datosPorMateria,
    materiaSeleccionada,
    carreraSeleccionada,
    semestreSeleccionado
  ) => {
    // Si no hay datos, retornar un objeto vacío
    if (!datosPorMateria || Object.keys(datosPorMateria).length === 0) {
      return {};
    }
    
    // Verificar si la materia seleccionada existe en los datos, si no, intentar con comparación insensible a mayúsculas
    let materiaKey = materiaSeleccionada;
    if (materiaSeleccionada !== 'TODAS' && !datosPorMateria[materiaSeleccionada]) {
      const materiaNormalizada = normalizarTexto(materiaSeleccionada);
      const materiaEncontrada = Object.keys(datosPorMateria).find(
        m => normalizarTexto(m) === materiaNormalizada
      );
      
      if (materiaEncontrada) {
        materiaKey = materiaEncontrada;
      } else {
        // Si no se encuentra la materia, retornar objeto vacío
        return {};
      }
    }
    
    // Seleccionar los datos según la materia
    const datosDeMateriaSeleccionada = datosPorMateria[materiaKey] || {};
    
    // Si no hay datos para esta materia, retornar objeto vacío
    if (!datosDeMateriaSeleccionada.carrerasSemestres) {
      return {};
    }
    
    // Crear una copia profunda para no modificar el estado original
    const resultado = JSON.parse(JSON.stringify(datosDeMateriaSeleccionada.carrerasSemestres));
    
    // Aplicar filtro de carrera
    if (carreraSeleccionada !== 'TODAS') {
      // Si la carrera seleccionada no existe, retornar objeto vacío
      if (!resultado[carreraSeleccionada]) {
        return {};
      }
      
      // Filtrar solo la carrera seleccionada
      const datosFiltradosPorCarrera = {
        [carreraSeleccionada]: resultado[carreraSeleccionada]
      };
      
      // Aplicar filtro de semestre si corresponde
      if (semestreSeleccionado !== 'TODOS') {
        // Si el semestre seleccionado no existe, retornar objeto vacío
        if (!datosFiltradosPorCarrera[carreraSeleccionada][semestreSeleccionado]) {
          return {};
        }
        
        // Filtrar solo el semestre seleccionado
        datosFiltradosPorCarrera[carreraSeleccionada] = {
          [semestreSeleccionado]: datosFiltradosPorCarrera[carreraSeleccionada][semestreSeleccionado]
        };
      }
      
      return datosFiltradosPorCarrera;
    }
    
    // Si no se filtra por carrera, retornar todos los datos de la materia seleccionada
    return resultado;
  };