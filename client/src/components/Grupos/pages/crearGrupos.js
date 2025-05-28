// src/pages/CrearGrupos.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../Docentes/Layout';
import '../style/crearGrupos.css';
import { 
  createGrupo,
  getSemestresDisponibles,
  getParalelosDisponibles,
  carreraNecesitaParalelo,
  getParaleloPorDefecto,
  validarDatosGrupo
} from '../../../service/grupoService';
import MATERIAS_POR_SEMESTRE from '../../../util/materias/materias_sis';
import MATERIAS_POR_SEMESTRE_ETN from '../../../util/materias/materias_etn';
import MATERIAS_POR_SEMESTRE_AGRO from '../../../util/materias/materias_agro';
import MATERIAS_POR_SEMESTRE_BASICAS from '../../../util/materias/materias_basic';
import MATERIAS_POR_SEMESTRE_COM from '../../../util/materias/materias_com';
import MATERIAS_POR_SEMESTRE_CIVIL from '../../../util/materias/materias_cvil';
import MATERIAS_POR_SEMESTRE_TEC_SUP_DGCA from '../../../util/materias/materias_tec_diseño';
import MATERIAS_POR_SEMESTRE_TEC_SUP_INF from '../../../util/materias/materias_tec_inf';
import MATERIAS_POR_SEMESTRE_TEC_SUP_SE from '../../../util/materias/materias_tec_etn';
import MATERIAS_POR_SEMESTRE_TEC_SUP_ER from '../../../util/materias/materias_energ';
import MATERIAS_POR_SEMESTRE_TEC_SUP_CC from '../../../util/materias/materias_tec_cons_civ';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CrearGrupos() {
  const navigate = useNavigate();
  
  // Estado del formulario principal (incluye paralelo)
  const [formData, setFormData] = useState({
    nombre_proyecto: '',
    carrera: '',
    semestre: '',
    paralelo: '', // Nuevo campo para paralelos
    materia: ''
  });
  
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validFields, setValidFields] = useState({
    nombre_proyecto: false,
    carrera: false,
    semestre: false,
    paralelo: true, // Inicialmente true porque puede no ser requerido
    materia: false
  });
  
  // Estados para carreras y paralelos
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);
  const [carrerasDisponibles, setCarrerasDisponibles] = useState([]);
  const [docenteTieneCienciasBasicas, setDocenteTieneCienciasBasicas] = useState(false);

  // Mapa de todas las carreras disponibles en el sistema
  const TODAS_CARRERAS = [
    { value: 'Ingeniería de Sistemas', label: 'Ingeniería de Sistemas' },
    { value: 'Ingeniería de Sistemas Electronicos', label: 'Ingeniería de Sistemas Electronicos' },
    { value: 'Ingeniería Agroindustrial', label: 'Ingeniería Agroindustrial' },
    { value: 'Ciencias Básicas', label: 'Ciencias Básicas' },
    { value: 'Ingeniería Comercial', label: 'Ingeniería Comercial' },
    { value: 'Ingeniería Civil', label: 'Ingeniería Civil' },
    { value: 'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual', label: 'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual' },
    { value: 'Tec. Sup. en Informática', label: 'Tec. Sup. en Informática' },
    { value: 'Tec. Sup. en Sistemas Electrónicos', label: 'Tec. Sup. en Sistemas Electrónicos' },
    { value: 'Técnico Superior en Energías Renovables', label: 'Técnico Superior en Energías Renovables' },
    { value: 'Tec. Sup. Contrucción Civil', label: 'Tec. Sup. Contrucción Civil' }
  ];

  // Obtener las carreras del docente desde sessionStorage
  const obtenerCarrerasDocente = () => {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        if (usuario && usuario.carreras && Array.isArray(usuario.carreras)) {
          return usuario.carreras;
        }
      }
      return [];
    } catch (error) {
      console.error("Error al obtener carreras del docente:", error);
      return [];
    }
  };

  // Cargar las carreras asignadas al docente cuando el componente se monta
  useEffect(() => {
    const carreras = obtenerCarrerasDocente();
    setCarrerasAsignadas(carreras);
    
    // Verificar si el docente tiene Ciencias Básicas asignada
    const tieneCienciasBasicas = carreras.includes('Ciencias Básicas');
    setDocenteTieneCienciasBasicas(tieneCienciasBasicas);
    
    // Filtrar las carreras disponibles basadas en las asignadas al docente
    const carrerasFiltradas = TODAS_CARRERAS.filter(carrera => 
  carreras.includes(carrera.value)
);
setCarrerasDisponibles(carrerasFiltradas);
    
    // Si no hay carreras asignadas, mostrar mensaje de error
    if (carreras.length === 0) {
      toast.error("No tiene carreras asignadas. Contacte con el administrador.");
    }
  }, []);

  // Función para obtener el objeto de materias según la carrera
  const getMateriasCarrera = (carrera) => {
    switch (carrera) {
      case 'Ingeniería de Sistemas':
        return MATERIAS_POR_SEMESTRE;
      case 'Ingeniería de Sistemas Electronicos':
        return MATERIAS_POR_SEMESTRE_ETN;
      case 'Ingeniería Agroindustrial':
        return MATERIAS_POR_SEMESTRE_AGRO;
      case 'Ciencias Básicas':
        return MATERIAS_POR_SEMESTRE_BASICAS;
      case 'Ingeniería Comercial':
        return MATERIAS_POR_SEMESTRE_COM;
      case 'Ingeniería Civil':
        return MATERIAS_POR_SEMESTRE_CIVIL;
      case 'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_DGCA;
      case 'Tec. Sup. en Informática':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_INF;
      case 'Tec. Sup. en Sistemas Electrónicos':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_SE;
      case 'Técnico Superior en Energías Renovables':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_ER;
      case 'Tec. Sup. Contrucción Civil':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_CC;
      default:
        return {};
    }
  };

  // Efecto para validar los campos requeridos (incluye lógica de paralelo)
  useEffect(() => {
    const { nombre_proyecto, carrera, semestre, paralelo, materia } = formData;
    
    // Determinar si el paralelo es requerido
    const paraleloRequerido = carreraNecesitaParalelo(carrera);
    
    setValidFields(prevState => ({
      ...prevState,
      nombre_proyecto: nombre_proyecto.trim() !== '',
      carrera: carrera !== '',
      semestre: semestre !== '',
      paralelo: paraleloRequerido ? (paralelo !== '') : true, // Solo requerido para Ciencias Básicas
      materia: materia !== ''
    }));
  }, [formData]);

  // Efecto para auto-asignar paralelo por defecto cuando cambia la carrera
  useEffect(() => {
    if (formData.carrera) {
      const paraleloDefecto = getParaleloPorDefecto(formData.carrera);
      
      // Solo auto-asignar si no es Ciencias Básicas (para Ciencias Básicas debe seleccionar manualmente)
      if (!carreraNecesitaParalelo(formData.carrera)) {
        setFormData(prev => ({
          ...prev,
          paralelo: paraleloDefecto
        }));
      } else if (!formData.paralelo) {
        // Para Ciencias Básicas, limpiar el paralelo para forzar selección manual
        setFormData(prev => ({
          ...prev,
          paralelo: ''
        }));
      }
    }
  }, [formData.carrera]);

  // Actualizar la lista de materias cuando cambia el semestre o la carrera
  useEffect(() => {
    if (formData.semestre && formData.carrera) {
      // Obtener el objeto de materias según la carrera
      const materiasCarrera = getMateriasCarrera(formData.carrera);
      
      // Verificar si existen materias para ese semestre
      const materiasDelSemestre = materiasCarrera[formData.semestre] || [];
      setMaterias(materiasDelSemestre);
      
      // Resetear la materia seleccionada al cambiar semestre o carrera
      setFormData(prevData => ({
        ...prevData,
        materia: ''
      }));
    } else {
      setMaterias([]);
    }
  }, [formData.semestre, formData.carrera]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validar que solo se puedan seleccionar carreras asignadas al docente
    if (name === 'carrera' && value !== '') {
      if (!carrerasAsignadas.includes(value)) {
        toast.error("No tiene permisos para crear grupos en esta carrera");
        return;
      }
    }
    
    // Si cambia la carrera, resetear también el semestre, paralelo y materia
    if (name === 'carrera') {
      setFormData({
        ...formData,
        [name]: value,
        semestre: '',
        paralelo: '', // Resetear paralelo para que se auto-asigne o requiera selección
        materia: ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar que la carrera esté asignada al docente
      if (!carrerasAsignadas.includes(formData.carrera)) {
        throw new Error("No tiene permisos para crear grupos en esta carrera");
      }

      // Validar paralelo para Ciencias Básicas
      if (carreraNecesitaParalelo(formData.carrera) && !formData.paralelo) {
        toast.error('El paralelo es obligatorio para Ciencias Básicas');
        setLoading(false);
        return;
      }
      
      // Preparar datos del grupo usando validación del servicio
      const datosGrupo = {
        nombre_proyecto: formData.nombre_proyecto,
        carrera: formData.carrera,
        semestre: formData.semestre,
        paralelo: formData.paralelo || getParaleloPorDefecto(formData.carrera),
        materia: formData.materia
      };
      const grupoCreado = await createGrupo(datosGrupo);
      
      // Notificación de éxito
      toast.success('Grupo creado exitosamente. Redirigiendo a asignación de estudiantes...', {
        className: 'toast-notification'
      });
      
      // Después de 2 segundos de mostrar el mensaje de éxito, redirigir a asignación de estudiantes
      setTimeout(() => {
        navigate(`/grupos/asignar?id=${grupoCreado.id}`, { 
          state: { grupoId: grupoCreado.id } 
        });
      }, 2000);
      
      // Resetear el formulario
      setFormData({
        nombre_proyecto: '',
        carrera: '',
        semestre: '',
        paralelo: '',
        materia: ''
      });
      
    } catch (err) {
      console.error("Error al crear el grupo:", err);
      toast.error(err.message || "Error al crear el grupo. Por favor, intente de nuevo.", {
        className: 'toast-notification'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/grupos/gestion');
  };
  
  // Función para determinar la clase CSS de cada campo del formulario
  const getFieldClass = (fieldName) => {
    // Si el campo tiene contenido, verificamos si es válido
    if (formData[fieldName] && (typeof formData[fieldName] === 'string' ? formData[fieldName].trim() !== '' : true)) {
      return validFields[fieldName] ? 'valid' : '';
    }
    return '';
  };

  // Verificar si todos los campos son válidos para habilitar el botón de envío
  const formIsValid = () => {
    return Object.values(validFields).every(valid => valid === true);
  };

  // Determinar si mostrar el campo de paralelo
  const mostrarCampoParalelo = docenteTieneCienciasBasicas && carreraNecesitaParalelo(formData.carrera);
  
  // Obtener los semestres y paralelos disponibles según la carrera seleccionada
  const semestresDisponibles = getSemestresDisponibles(formData.carrera);
  const paralelosDisponibles = getParalelosDisponibles(formData.carrera);

  return (
    <Layout>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="grupo-form-styles">
        <div className="crear-grupo-container">
          <h1>Crear Nuevo Grupo</h1>
          
          {carrerasAsignadas.length === 0 && (
            <div className="error-message">
              No tiene carreras asignadas. Contacte con el administrador para que le asigne carreras.
            </div>
          )}
          
          <form className="crear-grupo-form" onSubmit={handleSubmit}>
            <div className={`form-group ${getFieldClass('nombre_proyecto')}`}>
              <label htmlFor="nombre_proyecto">Nombre del Proyecto:</label>
              <input
                type="text"
                id="nombre_proyecto"
                name="nombre_proyecto"
                value={formData.nombre_proyecto}
                onChange={handleChange}
                required
                placeholder="Ingrese el nombre del proyecto"
                disabled={carrerasAsignadas.length === 0}
              />
            </div>
            
            <div className={`form-group ${getFieldClass('carrera')}`}>
              <label htmlFor="carrera">Carrera:</label>
              <select
                id="carrera"
                name="carrera"
                value={formData.carrera}
                onChange={handleChange}
                required
                disabled={carrerasAsignadas.length === 0}
              >
                <option value="">Seleccione una carrera</option>
                {carrerasDisponibles.map((carrera, index) => (
                  <option key={index} value={carrera.value}>
                    {carrera.label}
                  </option>
                ))}
              </select>
              {carrerasAsignadas.length === 0 && (
                <p className="help-text">No tiene carreras asignadas. Contacte con el administrador.</p>
              )}
            </div>
            
            <div className={`form-group ${getFieldClass('semestre')}`}>
              <label htmlFor="semestre">Semestre:</label>
              <select
                id="semestre"
                name="semestre"
                value={formData.semestre}
                onChange={handleChange}
                required
                disabled={!formData.carrera || carrerasAsignadas.length === 0}
              >
                <option value="">Seleccione un semestre</option>
                {semestresDisponibles.map((semestre, index) => (
                  <option key={index} value={semestre.value}>
                    {semestre.label}
                  </option>
                ))}
              </select>
              {!formData.carrera && (
                <p className="help-text">Seleccione primero una carrera.</p>
              )}
            </div>

            {/* Campo de paralelo - Solo visible cuando es relevante */}
            {mostrarCampoParalelo && (
              <div className={`form-group ${getFieldClass('paralelo')} paralelo-field`}>
                <label htmlFor="paralelo">
                  Paralelo:
                  <span className="required-indicator">*</span>
                </label>
                <select
                  id="paralelo"
                  name="paralelo"
                  value={formData.paralelo}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccione un paralelo</option>
                  {paralelosDisponibles.map((paralelo, index) => (
                    <option key={index} value={paralelo.value}>
                      {paralelo.label}
                    </option>
                  ))}
                </select>
                <p className="help-text">
                  Solo podrá asignar estudiantes del mismo paralelo a este grupo.
                </p>
              </div>
            )}
            
            {/* Campo para materia */}
            <div className={`form-group ${getFieldClass('materia')}`}>
              <label htmlFor="materia">Materia:</label>
              <select
                id="materia"
                name="materia"
                value={formData.materia}
                onChange={handleChange}
                required
                disabled={!formData.semestre || materias.length === 0 || carrerasAsignadas.length === 0}
              >
                <option value="">Seleccione una materia</option>
                {materias.map((materia, index) => (
                  <option key={index} value={materia}>
                    {materia}
                  </option>
                ))}
              </select>
              {formData.semestre && materias.length === 0 && (
                <p className="help-text">No hay materias disponibles para este semestre en la carrera seleccionada.</p>
              )}
              {!formData.semestre && (
                <p className="help-text">Seleccione un semestre para ver las materias disponibles.</p>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-cancelar" 
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className={`btn-guardar ${loading ? 'loading' : ''}`}
                disabled={loading || !formIsValid() || carrerasAsignadas.length === 0}
              >
                {loading ? 'Guardando...' : 'Guardar Grupo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default CrearGrupos;