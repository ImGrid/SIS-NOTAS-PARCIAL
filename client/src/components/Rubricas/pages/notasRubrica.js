// src/components/Rubricas/pages/notasRubrica.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../Docentes/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../style/notasRubrica.css'; // Importar los estilos

// Importar servicios para obtener los datos necesarios
import { getGrupoPorId } from '../../../service/grupoService';
import { getEstudiantesByGrupoId } from '../../../service/estudianteService';
import { getInformesPorGrupoId } from '../../../service/informeService';
import { getRubricaPorId } from '../../../service/rubricaService';
import { getDocenteById } from '../../../service/docenteService';
import { getCalificacionPorId } from '../../../service/calificacionService';

function NotasRubrica() {
  // Estados para almacenar los datos
  const [grupo, setGrupo] = useState(null);
  const [, setEstudiantes] = useState([]);
  const [, setInformes] = useState([]);
  const [, setRubricas] = useState({});
  const [, setCalificaciones] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [datosEvaluacion, setDatosEvaluacion] = useState([]);
  const [docenteActual, setDocenteActual] = useState(null);

  // Obtener el ID del grupo de los parámetros de la URL
  const { id } = useParams();
  const navigate = useNavigate();

  // Función para cargar todos los datos necesarios
  useEffect(() => {
    const cargarDatos = async () => {
      if (!id) {
        toast.error('ID de grupo no proporcionado');
        navigate('/evaluaciones/gestionar');
        return;
      }

      try {
        setLoading(true);

        // 1. Cargar información del grupo
        const grupoData = await getGrupoPorId(id);
        setGrupo(grupoData);

        // 2. Cargar estudiantes del grupo
        const estudiantesData = await getEstudiantesByGrupoId(id);
        setEstudiantes(estudiantesData);

        // 3. Cargar informes del grupo
        const informesData = await getInformesPorGrupoId(id);
        setInformes(informesData);

        // 4. Obtener información del docente desde sessionStorage y luego obtener sus datos completos
        const usuarioString = sessionStorage.getItem('usuario');
        if (usuarioString) {
          try {
            const usuario = JSON.parse(usuarioString);
            // Guardar el ID del docente actual
            if (usuario && usuario.id) {
              // Obtener la información completa del docente utilizando el ID obtenido de sessionStorage
              const docenteData = await getDocenteById(usuario.id);
              setDocenteActual(docenteData);
            }
          } catch (error) {
            console.error('Error al obtener datos del docente:', error);
          }
        }

        // 5. Cargar rúbricas y calificaciones para cada informe
        const rubricasObj = {};
        const calificacionesObj = {};
        const datosEvaluacionArr = [];

        for (const informe of informesData) {
          // Buscar estudiante correspondiente
          const estudiante = estudiantesData.find(est => est.id === informe.estudiante_id);
          
          if (!estudiante) continue; // Si no se encuentra el estudiante, continuar con el siguiente informe
          
          // Cargar rúbrica
          let rubrica = null;
          if (informe.rubrica_id) {
            try {
              rubrica = await getRubricaPorId(informe.rubrica_id);
              rubricasObj[informe.rubrica_id] = rubrica;
            } catch (error) {
              console.error(`Error al cargar rúbrica ${informe.rubrica_id}:`, error);
            }
          }

          // Cargar calificación
          let calificacion = null;
          if (informe.calificacion_id) {
            try {
              calificacion = await getCalificacionPorId(informe.calificacion_id);
              calificacionesObj[informe.calificacion_id] = calificacion;
            } catch (error) {
              console.error(`Error al cargar calificación ${informe.calificacion_id}:`, error);
            }
          }

          // Agregar datos de evaluación
          datosEvaluacionArr.push({
            estudiante,
            informe,
            rubrica,
            calificacion
          });
        }

        setRubricas(rubricasObj);
        setCalificaciones(calificacionesObj);
        setDatosEvaluacion(datosEvaluacionArr);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('Error al cargar los datos de evaluación. Por favor, intente de nuevo más tarde.');
        setLoading(false);
      }
    };

    cargarDatos();
  }, [id, navigate]);

  // Función para formatear notas con dos decimales
  const formatearNota = (nota) => {
    if (nota === null || nota === undefined) return '-';
    if (typeof nota === 'number') return nota.toFixed(2);
    if (typeof nota === 'string' && !isNaN(parseFloat(nota))) return parseFloat(nota).toFixed(2);
    return nota || '-';
  };

  // Obtener la fecha actual en formato DD/MM/YYYY
  const obtenerFechaActual = () => {
    const fecha = new Date();
    return `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
  };

  // Renderizado para estado de carga
  if (loading) {
    return (
      <div className="docentes-container">
        <ToastContainer position="top-right" autoClose={3000} />
        <Sidebar />
        <main className="content content-with-sidebar notas-evaluacion">
          <div className="evaluacion-header">
            <h1>EVALUACIÓN GRUPAL</h1>
            <h2>Examen Final - Semestre {new Date().getMonth() < 6 ? 'I' : 'II'}/{new Date().getFullYear()}</h2>
          </div>
          <div className="evaluacion-container">
            <div className="loading-indicator">Cargando datos de evaluación...</div>
          </div>
        </main>
      </div>
    );
  }

  // Renderizado para estado de error
  if (error) {
    return (
      <div className="docentes-container">
        <ToastContainer position="top-right" autoClose={3000} />
        <Sidebar />
        <main className="content content-with-sidebar notas-evaluacion">
          <div className="evaluacion-header">
            <h1>EVALUACIÓN GRUPAL</h1>
            <h2>Examen Final - Semestre {new Date().getMonth() < 6 ? 'I' : 'II'}/{new Date().getFullYear()}</h2>
          </div>
          <div className="evaluacion-container">
            <div className="error-message">{error}</div>
            <div className="acciones-container">
              <button 
                className="btn-volver"
                onClick={() => navigate('/evaluaciones/gestionar')}
              >
                Ir atras
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Renderizado principal
  return (
    <div className="docentes-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <Sidebar />
      <main className="content content-with-sidebar notas-evaluacion">
        <div className="evaluacion-header">
          <h1>EVALUACIÓN GRUPAL</h1>
          <h2>Examen Final - Semestre {new Date().getMonth() < 6 ? 'I' : 'II'}/{new Date().getFullYear()}</h2>
        </div>

        <div className="evaluacion-container">
          {/* Información del proyecto fuera del encabezado */}
          <div className="proyecto-info-container">
            <div className="proyecto-info">
              <div className="proyecto-info-item">
                <div className="proyecto-info-label">Proyecto:</div>
                <div className="proyecto-info-value">{grupo?.nombre_proyecto || 'Sin nombre de proyecto'}</div>
              </div>
              <div className="proyecto-info-item">
                <div className="proyecto-info-label">Fecha de evaluación:</div>
                <div className="proyecto-info-value">{obtenerFechaActual()}</div>
              </div>
              <div className="proyecto-info-item">
                <div className="proyecto-info-label">Docente evaluador:</div>
                <div className="proyecto-info-value">{docenteActual ? docenteActual.nombre_completo : 'No especificado'}</div>
              </div>
            </div>
          </div>

          <div className="evaluacion-estudiantes">
            <h3>Evaluación de estudiantes</h3>
            
            <table className="tabla-evaluacion">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Estudiante</th>
                  <th>Presentación (30%)</th>
                  <th>Sustentación (30%)</th>
                  <th>Documentación (30%)</th>
                  <th>Innovación (10%)</th>
                  <th>Nota Final</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {datosEvaluacion.map((datos) => (
                  <tr key={datos.estudiante.id}>
                    <td>{datos.estudiante.codigo}</td>
                    <td>{`${datos.estudiante.nombre} ${datos.estudiante.apellido}`}</td>
                    <td>
                      <span className="nota-valor">{formatearNota(datos.rubrica?.presentacion)}</span>
                    </td>
                    <td>
                      <span className="nota-valor">{formatearNota(datos.rubrica?.sustentacion)}</span>
                    </td>
                    <td>
                      <span className="nota-valor">{formatearNota(datos.rubrica?.documentacion)}</span>
                    </td>
                    <td>
                      <span className="nota-valor">{formatearNota(datos.rubrica?.innovacion)}</span>
                    </td>
                    <td>
                      <span className="nota-valor"><strong>{formatearNota(datos.rubrica?.nota_final)}</strong></span>
                    </td>
                    <td>
                      <strong className={datos.rubrica?.observaciones === 'APROBADO' ? 'aprobado' : 'reprobado'}>
                        {datos.rubrica?.observaciones || '-'}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="acciones-container">
            <button 
              className="btn-volver"
              onClick={() => navigate('/evaluaciones/gestionar')}
            >
              Ir atras
            </button>
            
            <button 
              className="btn-imprimir"
              onClick={() => window.print()}
            >
              Imprimir Evaluación
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NotasRubrica;