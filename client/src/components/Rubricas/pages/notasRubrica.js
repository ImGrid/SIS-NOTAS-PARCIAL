// src/components/Rubricas/pages/notasRubrica.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../Docentes/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../style/notasRubrica.css';

// Importar servicios para obtener los datos necesarios
import { getGrupoPorId } from '../../../service/grupoService';
import { getEstudiantesByGrupoId } from '../../../service/estudianteService';
import { getInformesPorGrupoId } from '../../../service/informeService';
import { getRubricaPorId } from '../../../service/rubricaService';
import { getDocenteById } from '../../../service/docenteService';
import { getCalificacionPorId } from '../../../service/calificacionService';

// Importar función para verificar si necesita paralelo
import { carreraNecesitaParalelo } from '../../../service/grupoService';

// Importar utilidades para PDF
import { 
  generarPDFEvaluacion, 
  generarNombreArchivoPDF, 
  verificarSoportePDF 
} from '../../../util/pdf/gruposPdf';

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
  const [generandoPDF, setGenerandoPDF] = useState(false);
  // Estados para fecha y comentarios
  const [fechaEvaluacion, setFechaEvaluacion] = useState('');
  const [comentariosGrupo, setComentariosGrupo] = useState('');
  
  // Estado para controlar si mostrar columna de paralelo
  const [mostrarColumnaParalelo, setMostrarColumnaParalelo] = useState(false);

  // Ref para el contenedor del PDF
  const pdfRef = useRef(null);

  // Obtener el ID del grupo de los parámetros de la URL
  const { id } = useParams();
  const navigate = useNavigate();

  // Verificar soporte de PDF al montar el componente
  useEffect(() => {
    if (!verificarSoportePDF()) {
      toast.warning('Tu navegador podría tener problemas para generar PDFs. Se recomienda usar Chrome o Firefox.');
    }
  }, []);

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

        const grupoData = await getGrupoPorId(id);
        setGrupo(grupoData);
        
        // Determinar si mostrar columna de paralelo basado en la carrera del grupo
        const necesitaParalelo = carreraNecesitaParalelo(grupoData.carrera);
        setMostrarColumnaParalelo(necesitaParalelo);

        const estudiantesData = await getEstudiantesByGrupoId(id);
        setEstudiantes(estudiantesData);

        const informesData = await getInformesPorGrupoId(id);
        setInformes(informesData);

        const usuarioString = sessionStorage.getItem('usuario');
        if (usuarioString) {
          try {
            const usuario = JSON.parse(usuarioString);
            if (usuario && usuario.id) {
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
        let fechaCalificacion = null;
        let comentarios = '';

        for (const informe of informesData) {
          // Buscar estudiante correspondiente
          const estudiante = estudiantesData.find(est => est.id === informe.estudiante_id);
          
          if (!estudiante) continue;
          
          // Cargar rúbrica
          let rubrica = null;
          if (informe.rubrica_id) {
            try {
              rubrica = await getRubricaPorId(informe.rubrica_id);
              rubricasObj[informe.rubrica_id] = rubrica;
              
              if (!comentarios && rubrica && rubrica.comentarios) {
                comentarios = rubrica.comentarios;
              }
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
              
              if (!fechaCalificacion && calificacion && calificacion.fecha) {
                fechaCalificacion = calificacion.fecha;
              }
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

        if (fechaCalificacion) {
          const fecha = new Date(fechaCalificacion);
          const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
          setFechaEvaluacion(fechaFormateada);
        } else {
          setFechaEvaluacion(obtenerFechaActual());
        }

        setComentariosGrupo(comentarios || '');

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

  const formatearNota = (nota) => {
    if (nota === null || nota === undefined) return '-';
    if (typeof nota === 'number') return nota.toFixed(2);
    if (typeof nota === 'string' && !isNaN(parseFloat(nota))) return parseFloat(nota).toFixed(2);
    return nota || '-';
  };

  const obtenerFechaActual = () => {
    const fecha = new Date();
    return `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
  };

  const handleDescargarPDF = async () => {
    if (!pdfRef.current) {
      toast.error('No se pudo encontrar el contenido para generar el PDF');
      return;
    }

    try {
      setGenerandoPDF(true);
      toast.info('Generando PDF...', { autoClose: 2000 });

      const nombreArchivo = generarNombreArchivoPDF(
        'evaluacion-grupal',
        grupo?.nombre_proyecto || '',
        fechaEvaluacion // Usamos la fecha de evaluación obtenida de las calificaciones
      );

      const opciones = {
        margin: [15, 15, 20, 15],
        filename: `${nombreArchivo}.pdf`,
        image: { 
          type: 'jpeg', 
          quality: 0.98 
        },
        html2canvas: { 
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'landscape'
        }
      };

      const exito = await generarPDFEvaluacion(pdfRef.current, nombreArchivo, opciones);
      
      if (exito) {
        toast.success('PDF descargado exitosamente');
      } else {
        toast.error('Error al generar el PDF. Por favor, intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error durante la generación del PDF:', error);
      toast.error('Ocurrió un error al generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const obtenerPeriodoYGestion = () => {
    if (datosEvaluacion.length > 0 && datosEvaluacion[0].calificacion) {
      const calificacion = datosEvaluacion[0].calificacion;
      const periodo = calificacion.periodo || (new Date().getMonth() < 6 ? 'I' : 'II');
      const gestion = calificacion.gestion || new Date().getFullYear();
      return `${periodo}/${gestion}`;
    }
    return `${new Date().getMonth() < 6 ? 'I' : 'II'}/${new Date().getFullYear()}`;
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
            <h2>GESTION - {obtenerPeriodoYGestion()}</h2>
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
            <h2>GESTION - {obtenerPeriodoYGestion()}</h2>
          </div>
          <div className="evaluacion-container">
            <div className="error-message">{error}</div>
            <div className="acciones-container">
              <button 
                className="btn-volver"
                onClick={() => navigate('/evaluaciones/gestionar')}
              >
                Ir atrás
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
        {/* Contenedor con ref para el PDF */}
        <div ref={pdfRef} className="pdf-container">
          <div className="evaluacion-header">
            <h1>EVALUACIÓN GRUPAL</h1>
            <h2>GESTION - {obtenerPeriodoYGestion()}</h2>
          </div>

          <div className="evaluacion-container">
            {/* Información del proyecto */}
            <div className="proyecto-info-container">
              <div className="proyecto-info">
                <div className="proyecto-info-item">
                  <div className="proyecto-info-label">Proyecto:</div>
                  <div className="proyecto-info-value">{grupo?.nombre_proyecto || 'Sin nombre de proyecto'}</div>
                </div>
                <div className="proyecto-info-item">
                  <div className="proyecto-info-label">Asignatura:</div>
                  <div className="proyecto-info-value">{grupo?.materia || 'Sin asignatura especificada'}</div>
                </div>
                <div className="proyecto-info-item">
                  <div className="proyecto-info-label">Carrera:</div>
                  <div className="proyecto-info-value">{grupo?.carrera || 'Sin carrera especificada'}</div>
                </div>
                <div className="proyecto-info-item">
                  <div className="proyecto-info-label">Semestre:</div>
                  <div className="proyecto-info-value">{grupo?.semestre || 'Sin semestre especificado'}</div>
                </div>
                {/* Mostrar paralelo solo si es Ciencias Básicas */}
                {mostrarColumnaParalelo && (
                  <div className="proyecto-info-item">
                    <div className="proyecto-info-label">Paralelo:</div>
                    <div className="proyecto-info-value">{grupo?.paralelo || 'A'}</div>
                  </div>
                )}
                <div className="proyecto-info-item">
                  <div className="proyecto-info-label">Fecha de evaluación:</div>
                  <div className="proyecto-info-value">{fechaEvaluacion}</div>
                </div>
                <div className="proyecto-info-item">
                  <div className="proyecto-info-label">Docente evaluador:</div>
                  <div className="proyecto-info-value">{docenteActual ? docenteActual.nombre_completo : 'No especificado'}</div>
                </div>
              </div>
            </div>

            <div className="evaluacion-estudiantes">
              <h3>Evaluación de estudiantes</h3>
              
              <table className={`tabla-evaluacion ${mostrarColumnaParalelo ? 'con-paralelo' : ''}`}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Estudiante</th>
                    {/* Mostrar columna de paralelo solo si es necesario */}
                    {mostrarColumnaParalelo && <th>Paralelo</th>}
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
                  <tr key={`${datos.estudiante.id}-${datos.informe.id}`}>
                    <td>{datos.estudiante.codigo}</td>
                    <td>{`${datos.estudiante.nombre} ${datos.estudiante.apellido}`}</td>
                    {/* Mostrar paralelo del estudiante solo si es necesario */}
                    {mostrarColumnaParalelo && (
                      <td>
                        <span className="paralelo-badge ciencias-basicas">
                          {datos.estudiante.paralelo || 'A'}
                        </span>
                      </td>
                    )}
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

            {/* Nueva sección para mostrar los comentarios del grupo */}
            <div className="comentarios-container">
              <h3>Comentarios generales</h3>
              <div className="comentarios-content">
                {comentariosGrupo ? comentariosGrupo : 'Ninguno'}
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción (fuera del contenedor del PDF) */}
        <div className="acciones-container">
          <button 
            className="btn-volver"
            onClick={() => navigate('/evaluaciones/gestionar')}
          >
            Ir atrás
          </button>
          
          <button 
            className="btn-imprimir"
            onClick={handleDescargarPDF}
            disabled={generandoPDF}
          >
            {generandoPDF ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
        </div>
      </main>
    </div>
  );
}

export default NotasRubrica;