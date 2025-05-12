// src/components/Supervisor/pages/supEstadisticas.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import LayoutSup from './LayoutSup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../style/supEstadisticas.css';

// Importar utilidades del admin-stats
import {
  useAdminStats,
  CHART_COLORS,
  CHART_CONFIGS,
  formatters
} from '../../../util/admin-stats';

function SupervisorEstadisticas() {
  // Hook personalizado para manejar estadísticas
  const {
    loading,
    datos,
    error,
    inicializado,
    aplicarFiltros,
    obtenerDashboard,
    actualizar,
    limpiarFiltros: limpiarFiltrosHook,
    estadoSistema
  } = useAdminStats();

  // Estados del componente
  const [dashboard, setDashboard] = useState(null);
  const [filtrosActivos, setFiltrosActivos] = useState({
    carrera: '',
    semestre: '',
    materia: 'TODAS',
    busqueda: ''
  });
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [cargandoFiltros, setCargandoFiltros] = useState(false);

  const navigate = useNavigate();

  // Cargar dashboard inicial
  useEffect(() => {
    const cargarDashboardInicial = async () => {
      if (inicializado && !dashboard) {
        try {
          const dashboardData = await obtenerDashboard(filtrosActivos);
          setDashboard(dashboardData);
        } catch (error) {
          console.error('Error al cargar dashboard inicial:', error);
          toast.error('Error al cargar estadísticas iniciales');
        }
      }
    };

    cargarDashboardInicial();
  }, [inicializado, dashboard, obtenerDashboard, filtrosActivos]);

  // Manejar cambios en filtros con logging detallado
  const manejarCambioFiltro = async (campo, valor) => {
    console.log(`Cambiando filtro ${campo} a: ${valor}`);
    
    const nuevosFiltros = { ...filtrosActivos, [campo]: valor };
    
    // Lógica especial para filtros dependientes
    if (campo === 'carrera') {
      nuevosFiltros.semestre = '';
      nuevosFiltros.materia = 'TODAS';
    } else if (campo === 'semestre') {
      nuevosFiltros.materia = 'TODAS';
    }
    
    console.log('Filtros nuevos:', nuevosFiltros);
    setFiltrosActivos(nuevosFiltros);
    setCargandoFiltros(true);
    
    try {
      // Verificar si hay filtros activos
      const hasFiltrosActivos = nuevosFiltros.carrera || 
                               nuevosFiltros.semestre || 
                               (nuevosFiltros.materia && nuevosFiltros.materia !== 'TODAS') ||
                               nuevosFiltros.busqueda;
      
      console.log('¿Hay filtros activos?', hasFiltrosActivos);
      
      if (hasFiltrosActivos) {
        // Aplicar filtros primero
        console.log('Aplicando filtros...');
        const resultado = await aplicarFiltros(nuevosFiltros);
        
        if (resultado.exito) {
          console.log('Filtros aplicados exitosamente, obteniendo dashboard...');
          // Luego obtener dashboard con datos filtrados
          const dashboardData = await obtenerDashboard(nuevosFiltros);
          setDashboard(dashboardData);
          
          // Log para verificar los datos del dashboard
          console.log('Dashboard actualizado:', {
            metricasPrincipales: dashboardData.metricasPrincipales,
            graficos: Object.keys(dashboardData.graficos)
          });
        } else {
          console.warn('Error al aplicar filtros:', resultado.validacion.mensaje);
          toast.warning(resultado.validacion.mensaje);
        }
      } else {
        // Sin filtros, obtener dashboard general
        console.log('Sin filtros activos, obteniendo dashboard general...');
        const dashboardData = await obtenerDashboard(nuevosFiltros);
        setDashboard(dashboardData);
      }
    } catch (error) {
      console.error('Error al aplicar filtros:', error);
      toast.error('Error al aplicar filtros');
    } finally {
      setCargandoFiltros(false);
    }
  };

  // Limpiar filtros con log
  const limpiarFiltros = async () => {
    console.log('Limpiando filtros...');
    
    const filtrosVacios = {
      carrera: '',
      semestre: '',
      materia: 'TODAS',
      busqueda: ''
    };
    
    setFiltrosActivos(filtrosVacios);
    
    try {
      // Limpiar en el hook también
      limpiarFiltrosHook();
      
      // Obtener dashboard general
      const dashboardData = await obtenerDashboard(filtrosVacios);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Error al limpiar filtros:', error);
      toast.error('Error al limpiar filtros');
    }
  };

  // Actualizar datos manualmente
  const actualizarDatos = async (forzar = false) => {
    try {
      const resultado = await actualizar(forzar);
      if (resultado.exito) {
        setUltimaActualizacion(new Date().toISOString());
        
        // Recargar dashboard con filtros actuales
        const dashboardData = await obtenerDashboard(filtrosActivos);
        setDashboard(dashboardData);
        toast.success('Datos actualizados correctamente');
      }
    } catch (error) {
      console.error('Error al actualizar datos:', error);
      toast.error('Error al actualizar los datos');
    }
  };

  // Renderizado condicional según estado
  if (loading && !inicializado) {
    return (
      <LayoutSup>
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="admin-estadisticas-styles">
          <div className="estadisticas-header">
            <div className="header-content">
              <h1>ESTADÍSTICAS DEL SISTEMA - VISTA ADMINISTRADOR</h1>
              <h2>Panel General de Evaluaciones</h2>
            </div>
          </div>
          <div className="estadisticas-container">
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Cargando datos del sistema...</p>
            </div>
          </div>
        </div>
      </LayoutSup>
    );
  }

  if (error) {
    return (
      <LayoutSup>
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="admin-estadisticas-styles">
          <div className="estadisticas-header">
            <div className="header-content">
              <h1>ESTADÍSTICAS DEL SISTEMA - VISTA ADMINISTRADOR</h1>
            </div>
            <div className="header-actions">
              <button 
                className="btn-volver"
                onClick={() => navigate('/supervisor/dashboard')}
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
          <div className="estadisticas-container">
            <div className="error-message">{error}</div>
            <button 
              className="btn-retry"
              onClick={() => actualizar(true)}
            >
              Reintentar Carga
            </button>
          </div>
        </div>
      </LayoutSup>
    );
  }

  // Preparar opciones de filtros dinámicamente
  const opcionesFiltros = datos?.filtros?.opciones || {};
  const carreras = opcionesFiltros.carreras || [];
  const semestres = filtrosActivos.carrera && opcionesFiltros.materias?.[filtrosActivos.carrera] 
    ? Object.keys(opcionesFiltros.materias[filtrosActivos.carrera]) 
    : [];
  const materias = filtrosActivos.carrera && filtrosActivos.semestre && opcionesFiltros.materias?.[filtrosActivos.carrera]?.[filtrosActivos.semestre]
    ? ['TODAS', ...opcionesFiltros.materias[filtrosActivos.carrera][filtrosActivos.semestre]]
    : ['TODAS'];

  // Preparar datos para gráficos
  const datosGraficos = dashboard?.graficos || {};
  const metricasPrincipales = dashboard?.metricasPrincipales || {};

  // Logging para debug
  console.log('Estado del sistema:', estadoSistema);
  console.log('Filtros activos:', filtrosActivos);
  console.log('Dashboard data:', dashboard);

  return (
    <LayoutSup>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="admin-estadisticas-styles">
        {/* Encabezado */}
        <div className="estadisticas-header">
          <div className="header-content">
            <h1>ESTADÍSTICAS DEL SISTEMA - VISTA ADMINISTRADOR</h1>
            <h2>Panel General de Evaluaciones</h2>
          </div>
          <div className="header-actions">
            <button 
              className="btn-actualizar"
              onClick={() => actualizarDatos()}
              disabled={loading || cargandoFiltros}
            >
              {loading || cargandoFiltros ? 'Cargando...' : 'Actualizar Datos'}
            </button>
            <button 
              className="btn-volver"
              onClick={() => navigate('/supervisor/dashboard')}
            >
              Volver
            </button>
          </div>
        </div>

        <div className="estadisticas-container" id="admin-estadisticas-container">
          {/* Información de contexto */}
          <div className="contexto-info">
            <div><strong>Fecha del informe:</strong> {new Date().toLocaleString('es-BO')}</div>
            <div><strong>Total de estudiantes:</strong> {metricasPrincipales.totalEstudiantes?.valor || 0}</div>
            {estadoSistema?.hayFiltros && (
              <div><strong>Modo:</strong> Vista filtrada</div>
            )}
            {ultimaActualizacion && (
              <div><strong>Última actualización:</strong> {new Date(ultimaActualizacion).toLocaleString('es-BO')}</div>
            )}
          </div>

          {/* Filtros avanzados */}
          <div className="filtros-container">
            {/* Barra de búsqueda global */}
            <div className="search-container">
              <label className="search-label">Búsqueda Global</label>
              <div className="search-input-field">
                <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar estudiantes, materias..."
                  value={filtrosActivos.busqueda}
                  onChange={(e) => manejarCambioFiltro('busqueda', e.target.value)}
                  className="search-input"
                />
                {filtrosActivos.busqueda && (
                  <button 
                    onClick={() => manejarCambioFiltro('busqueda', '')} 
                    className="clear-search"
                    title="Limpiar búsqueda"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filtros específicos */}
            <div className="filtros-row">
              {/* Filtro de carrera */}
              <div className="filtro">
                <label className="filtro-label">Carrera</label>
                <select 
                  id="carrera-select" 
                  value={filtrosActivos.carrera}
                  onChange={(e) => manejarCambioFiltro('carrera', e.target.value)}
                  disabled={cargandoFiltros}
                >
                  <option value="">Todas las carreras</option>
                  {carreras.map(carrera => (
                    <option key={carrera.value} value={carrera.value}>
                      {carrera.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtro de semestre */}
              <div className="filtro">
                <label className="filtro-label">Semestre</label>
                <select 
                  id="semestre-select" 
                  value={filtrosActivos.semestre}
                  onChange={(e) => manejarCambioFiltro('semestre', e.target.value)}
                  disabled={!filtrosActivos.carrera || cargandoFiltros}
                >
                  <option value="">Todos los semestres</option>
                  {semestres.map(semestre => (
                    <option key={semestre} value={semestre}>
                      {`${semestre}° Semestre`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de materia */}
              <div className="filtro">
                <label className="filtro-label">Materia</label>
                <select 
                  id="materia-select" 
                  value={filtrosActivos.materia}
                  onChange={(e) => manejarCambioFiltro('materia', e.target.value)}
                  disabled={!filtrosActivos.carrera || !filtrosActivos.semestre || cargandoFiltros}
                >
                  {materias.map(materia => (
                    <option key={materia} value={materia}>
                      {materia}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Botón limpiar filtros */}
              <button 
                onClick={limpiarFiltros} 
                className="btn-limpiar-filtros"
                title="Limpiar todos los filtros"
                disabled={!Object.values(filtrosActivos).some(v => v && v !== 'TODAS') || cargandoFiltros}
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Métricas principales */}
          <div className="metricas-principales">
            {Object.entries(metricasPrincipales).map(([key, metrica]) => (
              <div key={key} className="metrica-card" style={{borderTopColor: metrica.color}}>
                <div className="metrica-icon">
                  <svg className={`icon-${metrica.icono}`} width="24" height="24" viewBox="0 0 24 24">
                    {/* Aquí podrías agregar íconos SVG según el tipo */}
                  </svg>
                </div>
                <div className="metrica-info">
                  <div className="metrica-label">{metrica.etiqueta}</div>
                  <div className="metrica-valor" style={{color: metrica.color}}>
                    {metrica.valor}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dashboard simplificado con solo gráficos de torta y barras */}
          <div className="dashboard-graficos">
            {/* Solo gráficos de torta y barras */}
            <div className="graficos-row">
              {/* Gráfico circular de distribución */}
              <div className="grafico-container">
                <h4>Distribución de Estudiantes</h4>
                {datosGraficos.circulares?.[0]?.datos?.hayDatos ? (
                  <>
                    <div className="total-indicator">
                      <span className="total-label">Total de estudiantes:</span> 
                      <span className="total-value">{datosGraficos.circulares[0].datos.totalEstudiantes}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={CHART_CONFIGS.pieChart.height}>
                      <PieChart>
                        <Pie
                          data={datosGraficos.circulares[0].datos.chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={CHART_CONFIGS.pieChart.outerRadius}
                          fill="#8884d8"
                          dataKey="value"
                          label={({name, percent, value}) => `${name}: ${(percent * 100).toFixed(0)}% (${value})`}
                        >
                          {datosGraficos.circulares[0].datos.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [
                            `${value} estudiantes (${((value / datosGraficos.circulares[0].datos.totalEstudiantes) * 100).toFixed(1)}%)`,
                            name
                          ]} 
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="no-data-message">
                    {datosGraficos.circulares?.[0]?.datos?.mensaje || 
                     'No hay datos de estudiantes para los filtros seleccionados'}
                  </div>
                )}
              </div>
              
              {/* Gráfico de barras - Promedios por sección */}
              <div className="grafico-container">
                <h4>Calificaciones Promedio por Sección</h4>
                {datosGraficos.barras?.[0]?.datos?.hayDatos ? (
                  <>
                    <div className="promedio-indicator">
                      <span className="promedio-label">Promedio General:</span> 
                      <span className="promedio-value">
                        {formatters.formatearNumero(datosGraficos.barras[0].datos.promedioGeneral)}
                      </span>
                      <span className="interpretacion">
                        ({formatters.formatearResultado(datosGraficos.barras[0].datos.promedioGeneral)})
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={CHART_CONFIGS.barChart.height}>
                      <BarChart
                        data={datosGraficos.barras[0].datos.chartData}
                        margin={CHART_CONFIGS.barChart.margin}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tick={{fontSize: 12}}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          domain={[0, 10]} 
                          tick={{fontSize: 12}}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            `${formatters.formatearNumero(value)} pts`,
                            name
                          ]}
                        />
                        <Legend />
                        <Bar 
                          dataKey="valor" 
                          name="Promedio"
                          fill={CHART_COLORS.presentacion}
                        >
                          {datosGraficos.barras[0].datos.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                          <LabelList 
                            dataKey="valor" 
                            position="top" 
                            formatter={(value) => formatters.formatearNumero(value)}
                            style={{ fontSize: '11px', fill: '#333' }} 
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="no-data-message">
                    {datosGraficos.barras?.[0]?.datos?.mensaje || 
                     'No hay evaluaciones para los filtros seleccionados'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutSup>
  );
}

export default SupervisorEstadisticas;