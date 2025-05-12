// src/util/admin-stats/index.js

import React, { useState, useEffect } from 'react';

// Importar todos los módulos
import * as constants from './constants';
import * as dataProcessing from './dataProcessing';
import * as calculations from './calculations';
import * as filters from './filters';
import * as chartPreparer from './chartPreparer';

// Exportar constantes principales
export const {
  CHART_COLORS,
  CHART_CONFIGS,
  MESSAGES,
  THRESHOLDS,
  FORMATS,
  ESTADOS,
  EXPORT_CONFIGS,
  CATEGORIAS
} = constants;

// Exportar todas las funciones principales con nombres descriptivos
export {
  // Procesamiento de datos
  cargarDatosCompletos,
  procesarDatosParaComparacion,
  actualizarDatosIncrementales
} from './dataProcessing';

export {
  // Cálculos estadísticos
  calcularEstadisticasGlobales,
  calcularEstadisticasPorDocente,
  calcularComparativas,
  calcularTendencias
} from './calculations';

export {
  // Sistema de filtrado
  inicializarFiltros,
  aplicarFiltros,
  validarCombinacionFiltros,
  gestionarFiltrosInteligentes
} from './filters';

export {
  // Preparación de gráficos
  prepararGraficoCircular,
  prepararGraficoBarras,
  prepararDashboardCompleto
} from './chartPreparer';

/**
 * Clase principal para manejar estadísticas del administrador
 * Proporciona una API unificada para todas las operaciones estadísticas
 */
export class AdminStats {
  constructor() {
    this.datos = null;
    this.estadisticas = null;
    this.filtros = null;
    this.datosCache = new Map();
    this.ultimaCarga = null;
    this.datosFiltrados = null; // Añadir almacenamiento de datos filtrados
  }

  /**
   * Inicializar el sistema cargando todos los datos
   * @returns {Promise<Object>} Datos cargados
   */
  async inicializar() {
    console.log('Inicializando sistema de estadísticas del administrador...');
    
    try {
      // Cargar datos completos
      this.datos = await dataProcessing.cargarDatosCompletos();
      this.ultimaCarga = new Date().toISOString();
      
      // Calcular estadísticas globales
      this.estadisticas = {
        globales: calculations.calcularEstadisticasGlobales(this.datos),
        porDocente: calculations.calcularEstadisticasPorDocente(this.datos),
        comparativas: calculations.calcularComparativas(this.datos)
      };
      
      // Inicializar filtros
      this.filtros = filters.inicializarFiltros(this.datos);
      
      console.log('Sistema de estadísticas inicializado correctamente');
      
      return {
        exito: true,
        datos: this.datos,
        estadisticas: this.estadisticas,
        filtros: this.filtros
      };
    } catch (error) {
      console.error('Error al inicializar sistema de estadísticas:', error);
      throw error;
    }
  }

  /**
   * Aplicar filtros y obtener estadísticas filtradas
   * @param {Object} filtrosNuevos - Nuevos filtros a aplicar
   * @returns {Promise<Object>} Estadísticas filtradas
   */
  async aplicarFiltros(filtrosNuevos) {
    console.log('Aplicando filtros:', filtrosNuevos);
    
    try {
      // Validar y aplicar filtros
      // Verificación de seguridad: asegurarse que this.datos exista
      if (!this.datos) {
        console.error('Error: datos no disponibles para aplicar filtros');
        return {
          exito: false,
          error: 'Datos no inicializados',
          validacion: { esValido: false, mensaje: 'Inicialice el sistema primero' }
        };
      }
      
      const resultado = filters.aplicarFiltros(this.datos, filtrosNuevos);
      
      if (!resultado.error) {
        // Actualizar filtros activos
        this.filtros.filtrosActivos = filtrosNuevos;
        
        // Almacenar los datos filtrados
        this.datosFiltrados = resultado.datosFiltrados;
        
        // Calcular estadísticas filtradas
        let estadisticasFiltradas = resultado.datosFiltrados.estadisticas;
        
        // Si no hay estadísticas, crear un objeto vacío
        if (!estadisticasFiltradas) {
          estadisticasFiltradas = {
            totalEstudiantes: 0,
            estudiantesEvaluados: 0,
            estudiantesPendientes: 0,
            estudiantesAprobados: 0,
            estudiantesReprobados: 0,
            tasaCobertura: 0,
            tasaAprobacion: 0,
            tasaReprobacion: 0
          };
        }
        
        // Cachear resultado
        const cacheKey = this.generarCacheKey(filtrosNuevos);
        this.datosCache.set(cacheKey, {
          datos: resultado.datosFiltrados,
          estadisticas: estadisticasFiltradas,
          timestamp: Date.now()
        });
        
        return {
          exito: true,
          datos: resultado.datosFiltrados,
          estadisticas: estadisticasFiltradas,
          validacion: resultado.validacion
        };
      } else {
        return {
          exito: false,
          error: resultado.error,
          validacion: resultado.validacion
        };
      }
    } catch (error) {
      console.error('Error al aplicar filtros:', error);
      return {
        exito: false,
        error: error.message,
        validacion: { esValido: false, mensaje: 'Error interno al aplicar filtros' }
      };
    }
  }

  /**
   * Obtener dashboard completo con todos los gráficos
   * @param {Object} filtros - Filtros actuales
   * @returns {Promise<Object>} Dashboard completo
   */
  async obtenerDashboard(filtros = null) {
    const filtrosActuales = filtros || this.filtros?.filtrosActivos || {};
    
    try {
      // Verificar si existe en caché
      const cacheKey = this.generarCacheKey(filtrosActuales, 'dashboard');
      const cached = this.datosCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minutos
        console.log('Retornando dashboard desde caché');
        return cached.datos;
      }
      
      // Determinar qué datos usar
      let datosParaDashboard;
      let estadisticasParaDashboard;
      
      if (this.hayFiltrosActivos(filtrosActuales)) {
        // Si hay filtros activos, usar datos filtrados
        console.log('Usando datos filtrados para dashboard');
        
        if (!this.datosFiltrados) {
          // Si no tenemos datos filtrados, aplicar filtros primero
          try {
            const resultadoFiltrado = await this.aplicarFiltros(filtrosActuales);
            if (resultadoFiltrado.exito) {
              this.datosFiltrados = resultadoFiltrado.datos;
              estadisticasParaDashboard = resultadoFiltrado.estadisticas;
            } else {
              // Si hay un error, usar datos generales
              console.log('Error al aplicar filtros, usando datos generales');
              datosParaDashboard = this.datos;
              estadisticasParaDashboard = this.estadisticas?.globales;
            }
          } catch (error) {
            console.error('Error al aplicar filtros en obtenerDashboard:', error);
            // Usar datos generales en caso de error
            datosParaDashboard = this.datos;
            estadisticasParaDashboard = this.estadisticas?.globales;
          }
        } else {
          estadisticasParaDashboard = this.datosFiltrados.estadisticas;
        }
        
        datosParaDashboard = this.datosFiltrados;
      } else {
        // Si no hay filtros activos, usar datos generales
        console.log('Usando datos generales para dashboard');
        datosParaDashboard = this.datos;
        estadisticasParaDashboard = this.estadisticas?.globales;
      }
      
      // Preparar dashboard con los datos correctos
      const dashboard = chartPreparer.prepararDashboardCompleto(
        datosParaDashboard,
        estadisticasParaDashboard,
        filtrosActuales
      );
      
      // Cachear resultado
      this.datosCache.set(cacheKey, {
        datos: dashboard,
        timestamp: Date.now()
      });
      
      return dashboard;
    } catch (error) {
      console.error('Error al obtener dashboard:', error);
      // Devolver un dashboard vacío para evitar errores en la UI
      return chartPreparer.prepararDashboardCompleto(null, null, filtrosActuales);
    }
  }

  /**
   * Verificar si hay filtros activos
   * @param {Object} filtros - Filtros a verificar
   * @returns {boolean} True si hay filtros activos
   */
  hayFiltrosActivos(filtros) {
    return filtros.carrera || 
           filtros.semestre || 
           (filtros.materia && filtros.materia !== 'TODAS') ||
           filtros.busqueda;
  }

  /**
   * Actualizar datos del sistema
   * @param {boolean} forzarRecarga - Forzar recarga completa
   * @returns {Promise<Object>} Estado de la actualización
   */
  async actualizar(forzarRecarga = false) {
    console.log('Actualizando datos del sistema...');
    
    try {
      if (forzarRecarga || this.necesitaActualizacion()) {
        // Recargar todos los datos
        await this.inicializar();
        
        // Limpiar caché y datos filtrados
        this.datosCache.clear();
        this.datosFiltrados = null;
        
        // Si hay filtros activos, re-aplicarlos
        if (this.filtros && this.hayFiltrosActivos(this.filtros.filtrosActivos)) {
          await this.aplicarFiltros(this.filtros.filtrosActivos);
        }
        
        return {
          exito: true,
          mensaje: 'Datos actualizados completamente',
          ultimaCarga: this.ultimaCarga
        };
      } else {
        // Actualización incremental
        try {
          const datosActualizados = await dataProcessing.actualizarDatosIncrementales(
            this.datos,
            this.filtros?.filtrosActivos
          );
          
          this.datos = datosActualizados;
          
          // Re-aplicar filtros si están activos
          if (this.filtros && this.hayFiltrosActivos(this.filtros.filtrosActivos)) {
            await this.aplicarFiltros(this.filtros.filtrosActivos);
          }
          
          return {
            exito: true,
            mensaje: 'Datos actualizados incrementalmente',
            ultimaCarga: this.ultimaCarga
          };
        } catch (error) {
          console.error('Error en actualización incremental:', error);
          // Si falla la actualización incremental, intentar actualización completa
          return this.actualizar(true);
        }
      }
    } catch (error) {
      console.error('Error al actualizar datos:', error);
      return {
        exito: false,
        mensaje: `Error al actualizar datos: ${error.message}`,
        error
      };
    }
  }

  /**
   * Obtener estado actual del sistema
   * @returns {Object} Estado del sistema
   */
  obtenerEstado() {
    return {
      inicializado: !!this.datos,
      ultimaCarga: this.ultimaCarga,
      filtrosActivos: this.filtros?.filtrosActivos,
      hayFiltros: this.hayFiltrosActivos(this.filtros?.filtrosActivos || {}),
      cacheTamaño: this.datosCache.size,
      estadisticasDisponibles: !!this.estadisticas,
      datosFiltradosDisponibles: !!this.datosFiltrados,
      memoria: {
        totalEstudiantes: this.datos?.estudiantes?.porId?.size || 0,
        totalGrupos: this.datos?.grupos?.length || 0,
        totalDocentes: this.datos?.docentes?.length || 0,
        estudiantesFiltrados: this.datosFiltrados?.estudiantes?.length || 0,
        gruposFiltrados: this.datosFiltrados?.grupos?.length || 0
      }
    };
  }

  /**
   * Limpiar filtros y volver a vista general
   */
  limpiarFiltros() {
    this.datosFiltrados = null;
    if (this.filtros) {
      this.filtros.filtrosActivos = {
        carrera: '',
        semestre: '',
        materia: 'TODAS',
        busqueda: ''
      };
    }
  }

  /**
   * Generar clave para caché
   * @param {Object} filtros - Filtros
   * @param {string} tipo - Tipo de caché
   * @returns {string} Clave de caché
   */
  generarCacheKey(filtros, tipo = 'filtros') {
    const keyParts = [tipo];
    
    if (filtros.carrera) keyParts.push(`c:${filtros.carrera}`);
    if (filtros.semestre) keyParts.push(`s:${filtros.semestre}`);
    if (filtros.materia) keyParts.push(`m:${filtros.materia}`);
    if (filtros.busqueda) keyParts.push(`b:${filtros.busqueda}`);
    
    return keyParts.join('|');
  }

  /**
   * Verificar si necesita actualización
   * @returns {boolean} Si necesita actualización
   */
  necesitaActualizacion() {
    if (!this.ultimaCarga) return true;
    
    const tiempoTranscurrido = Date.now() - new Date(this.ultimaCarga).getTime();
    const TIEMPO_LIMITE = 1800000; // 30 minutos
    
    return tiempoTranscurrido > TIEMPO_LIMITE;
  }
}

/**
 * Instancia global de AdminStats
 * Singleton para evitar múltiples cargas de datos
 */
export const adminStats = new AdminStats();

/**
 * Hook para React que proporciona acceso fácil a las estadísticas
 * @returns {Object} Estado y funciones de estadísticas
 */
export const useAdminStats = () => {
  const [estado, setEstado] = useState({
    loading: false,
    datos: null,
    error: null,
    inicializado: false
  });

  // Inicializar al montar
  useEffect(() => {
    if (!adminStats.datos) {
      cargarDatos();
    } else {
      setEstado(prev => ({
        ...prev,
        datos: adminStats.datos,
        inicializado: true
      }));
    }
  }, []);

  const cargarDatos = async () => {
    setEstado(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const resultado = await adminStats.inicializar();
      setEstado({
        loading: false,
        datos: resultado,
        error: null,
        inicializado: true
      });
    } catch (error) {
      setEstado({
        loading: false,
        datos: null,
        error: error.message,
        inicializado: false
      });
    }
  };

  const aplicarFiltros = async (filtros) => {
    setEstado(prev => ({ ...prev, loading: true }));
    
    try {
      const resultado = await adminStats.aplicarFiltros(filtros);
      if (resultado.exito) {
        setEstado(prev => ({
          ...prev,
          loading: false,
          datos: { ...prev.datos, filtrados: resultado }
        }));
        return resultado;
      } else {
        setEstado(prev => ({
          ...prev,
          loading: false,
          error: resultado.error
        }));
        throw new Error(resultado.error);
      }
    } catch (error) {
      setEstado(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const obtenerDashboard = async (filtros) => {
    try {
      // No aplica filtros automáticamente, confía en que el método obtenerDashboard los manejará
      return await adminStats.obtenerDashboard(filtros);
    } catch (error) {
      console.error('Error en useAdminStats.obtenerDashboard:', error);
      throw error;
    }
  };

  const actualizar = async (forzar = false) => {
    setEstado(prev => ({ ...prev, loading: true }));
    
    try {
      const resultado = await adminStats.actualizar(forzar);
      if (resultado.exito) {
        setEstado(prev => ({
          ...prev,
          loading: false,
          datos: adminStats.datos
        }));
        return resultado;
      } else {
        setEstado(prev => ({
          ...prev,
          loading: false,
          error: resultado.mensaje
        }));
        throw new Error(resultado.mensaje);
      }
    } catch (error) {
      setEstado(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const limpiarFiltros = () => {
    adminStats.limpiarFiltros();
    // Actualizar estado para reflejar limpieza
    setEstado(prev => ({
      ...prev,
      datos: { ...prev.datos, filtrados: null }
    }));
  };

  return {
    ...estado,
    aplicarFiltros,
    obtenerDashboard,
    actualizar,
    limpiarFiltros,
    estadoSistema: adminStats.obtenerEstado()
  };
};

// Exportar módulos completos para uso directo
export { dataProcessing, calculations, filters, chartPreparer, constants };

// Exportar funciones auxiliares útiles
export const formatters = {
  formatearNumero: (num, decimales = 2) => {
    if (typeof num !== 'number') return '-';
    return num.toFixed(decimales);
  },
  
  formatearPorcentaje: (num, decimales = 1) => {
    if (typeof num !== 'number') return '-';
    return `${(num * 100).toFixed(decimales)}%`;
  },
  
  formatearFecha: (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-BO');
  },
  
  formatearResultado: (promedio) => {
    if (typeof promedio !== 'number') return 'SIN DATOS';
    if (promedio >= THRESHOLDS.notas.aprobacion) return 'APROBADO';
    return 'REPROBADO';
  }
};

// Crear objeto default de forma correcta
const adminStatsModule = {
  AdminStats,
  adminStats,
  useAdminStats,
  CHART_COLORS,
  CHART_CONFIGS,
  MESSAGES,
  THRESHOLDS,
  FORMATS,
  ESTADOS,
  EXPORT_CONFIGS,
  CATEGORIAS,
  formatters
};

// Exportación con nombre correcto para evitar el warning de ESLint
export { adminStatsModule as default };