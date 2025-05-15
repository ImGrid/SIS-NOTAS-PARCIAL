import React, { useState } from 'react';
import Sidebar from '../../Docentes/sidebar';
import '../style/vistaRubrica.css';

const VistaRubrica = () => {
  const [activeTab, setActiveTab] = useState('presentacion');

  // Escala de calificación con sus colores
  const escalaCalificacion = [
    { valor: 'SOBRESALIENTE', numero: '10 pts', color: '#30eb30' },
    { valor: 'EXCELENTE', numero: '9 pts', color: '#92d050' },
    { valor: 'MUY BUENO', numero: '8 pts', color: '#ffda9e' },
    { valor: 'BUENO', numero: '7 pts', color: '#b5dcfd' },
    { valor: 'SATISFACTORIO', numero: '6 pts', color: '#00bfff' },
    { valor: 'ACEPTABLE', numero: '5 pts', color: '#ffcc00' },
    { valor: 'BÁSICAMENTE ACEPTABLE', numero: '4 pts', color: '#ffee00' },
    { valor: 'INSUFICIENTE', numero: '3 pts', color: '#cd853f' },
    { valor: 'DEFICIENTE', numero: '2 pts', color: '#ff4444' },
    { valor: 'MUY DEFICIENTE', numero: '1 pts', color: '#ff0000' },
  ];

  // Mapa para obtener el color correspondiente a cada calificación
  const colorCalificacion = {};
  escalaCalificacion.forEach(item => {
    colorCalificacion[item.valor] = item.color;
  });

  // Función para determinar si el texto debe ser oscuro basado en el color de fondo
  const esColorClaro = (color) => {
    return ['#ffee00', '#ffcc00', '#ffda9e', '#90ee90', '#92d050', '#b5dcfd', '#30eb30'].includes(color);
  };

  // Estructura de datos para la rúbrica completa
  const rubrica = {
    presentacion: {
      criterios: [
        {
          nombre: 'PRESENTACIÓN ORAL 20%',
          subcriterios: [
            {
              nombre: 'CLARIDAD DE LA EXPOSICIÓN 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Presentación muy confusa y poco clara',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Exposición desorganizada y difícil de seguir',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Algunas partes son confusas o desorganizadas',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Buena organización, con mínimas dudas.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Información extremadamente clara',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'USO DE HERRAMIENTAS VISUALES Y TECNOLÓGICAS 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'No se usan recursos visuales o son irrelevantes.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Recursos visuales ineficaces o mal utilizados',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Recursos visuales básicos y poco impactantes',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Recursos adecuados pero mejorables en diseño o implementación',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Recursos visuales excelentes, claros y efectivos',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        },
        {
          nombre: 'TRABAJO EN EQUIPO 10%',
          subcriterios: [
            {
              nombre: 'PARTICIPACIÓN GRUPAL 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Participación insuficiente de la mayoría.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Participación muy desigual, algunos no contribuyen.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Participación desequilibrada.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Todos participan, con ligera desigualdad.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Todos participan de manera equitativa y colaborativa.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        }
      ]
    },
    sustentacion: {
      criterios: [
        {
          nombre: 'DOMINIO DEL CONTENIDO 20%',
          subcriterios: [
            {
              nombre: 'CONOCIMIENTO PROFUNDO DEL TEMA 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Conocimiento insuficiente, muy limitado.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Falta de comprensión en la mayoría de los aspectos.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Conocimiento básico con varias inseguridades.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Buen conocimiento con mínimas dudas.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Dominio total y detallado del tema.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'RESPUESTAS A PREGUNTAS DEL DOCENTE 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Incapacidad para responder preguntas.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Respuestas incorrectas o imprecisas.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Respuestas confusas o parciales.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Respuestas adecuadas con algunas dudas.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Respuestas claras, precisas y completas.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        },
        {
          nombre: 'DESARROLLO DE SOLUCIONES 10%',
          subcriterios: [
            {
              nombre: 'DESARROLLO DE SOLUCIONES 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Soluciones inadecuadas o inexistentes.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Limitadas y poco creativas.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Funcionales, pero básicas.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Adecuadas, pero no sobresalientes.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Soluciones innovadoras y eficaces.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        }
      ]
    },
    documentacion: {
      criterios: [
        {
          nombre: 'CALIDAD DE INFORME 10%',
          subcriterios: [
            {
              nombre: 'ESTRUCTURA DEL DOCUMENTO Y CUMPLIMIENTO DE OBJETIVOS 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Informe muy desorganizado e incompleto.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Informe desorganizado y parcialmente incompleto.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Informe básico con partes incompletas.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Informe bien organizado con algunas secciones mejorables.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Informe muy claro, bien organizado y completo.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'FORMATO Y REDACCIÓN 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Redacción muy deficiente y confusa.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Redacción muy confusa y con numerosos errores.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Redacción confusa con varios errores.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Redacción clara con algunos errores menores.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Redacción clara y precisa sin errores.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        },
        {
          nombre: 'INGENIERÍA DEL PROYECTO 20%',
          subcriterios: [
            {
              nombre: 'INGENIERÍA DEL PROYECTO 20%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Diseño muy simplificado y sin justificación.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Diseño simple y mal justificado.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Diseño básico con justificación limitada.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Diseño adecuado pero menos complejo.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Diseño técnico complejo y bien fundamentado.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        }
      ]
    },
    innovacion: {
      criterios: [
        {
          nombre: 'NIVEL DE CREATIVIDAD EN LA SOLUCIÓN 10%',
          subcriterios: [
            {
              nombre: 'NIVEL DE CREATIVIDAD EN LA SOLUCIÓN 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Sin elementos creativos o innovadores.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE']
                },
                {
                  descripcion: 'Solución básica sin innovación.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Solución convencional con poca creatividad.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Solución funcional con algunos elementos innovadores.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Solución altamente creativa e innovadora.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        }
      ]
    }
  };

  // Función para manejar la descarga de la rúbrica
  const handleDownloadRubrica = () => {
    const fileUrl = '/rubrica.xlsx';
    
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', 'rubrica.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderNivel = (nivel, index) => (
    <div key={index} className="nivel-column">
      <div className="nivel-container">
        <div className="nivel-descripcion">{nivel.descripcion}</div>
        <div className="calificaciones-container">
          {nivel.calificaciones.map((calificacion, idx) => (
            <div key={idx} className="calificacion-item">
              <span 
                className="calificacion-badge"
                style={{ 
                  backgroundColor: colorCalificacion[calificacion],
                  color: esColorClaro(colorCalificacion[calificacion]) ? '#333' : '#fff',
                }}
              >
                {calificacion}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Función para renderizar un subcriterio con sus niveles
  const renderSubcriterio = (subcriterio) => (
    <div className="subcriterio-container" key={subcriterio.nombre}>
      <div className={`subcriterio-titulo ${subcriterio.color}`}>
        {subcriterio.nombre}
      </div>
      <div className="niveles-grid">
        {subcriterio.niveles && subcriterio.niveles.map((nivel, index) => 
          renderNivel(nivel, index)
        )}
      </div>
    </div>
  );

  // Función para renderizar un criterio con sus subcriterios
  const renderCriterio = (criterio) => (
    <div className="criterio-container" key={criterio.nombre}>
      <div className={`criterio-titulo ${criterio.color}`}>
        {criterio.nombre}
      </div>
      {criterio.subcriterios && criterio.subcriterios.map(subcriterio => 
        renderSubcriterio(subcriterio)
      )}
    </div>
  );

  // Renderizar la sección activa
  const renderSeccion = (seccion) => (
    <div className="seccion-container">
      {seccion.criterios && seccion.criterios.map(criterio => 
        renderCriterio(criterio)
      )}
    </div>
  );

  return (
    <div className="vista-rubrica">
      <div className="main-container">
        <Sidebar />
        <div className="content-container">
          <div className="header-container">
            <h1 className="main-title">Rúbrica de Evaluación</h1>
            <button className="download-button" onClick={handleDownloadRubrica}>
              <svg className="download-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Descargar
            </button>
          </div>
          <div className="escala-calificacion-container"></div>
            {/* Escala de Calificación */}
            <div className="escala-calificacion-container">
              <div className="escala-titulo">Escala de Calificación</div>
              <div className="escala-rows">
                {/* Primera fila: calificaciones superiores (6-10) */}
                <div className="escala-row">
                  {escalaCalificacion.slice(0, 5).map((item) => (
                    <div 
                      key={item.valor}
                      className="escala-item"
                      style={{ 
                        backgroundColor: item.color,
                        color: esColorClaro(item.color) ? '#333' : '#fff',
                      }}
                    >
                      <span className="escala-item-num">{item.numero}:</span> {item.valor}
                    </div>
                  ))}
                </div>
                {/* Segunda fila: calificaciones inferiores (1-5) */}
                <div className="escala-row">
                  {escalaCalificacion.slice(5).map((item) => (
                    <div 
                      key={item.valor}
                      className="escala-item"
                      style={{ 
                        backgroundColor: item.color,
                        color: esColorClaro(item.color) ? '#333' : '#fff',
                      }}
                    >
                      <span className="escala-item-num">{item.numero}:</span> {item.valor}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Tabs para navegar entre secciones */}
            <div className="tabs-container">
              <button 
                onClick={() => setActiveTab('presentacion')}
                className={`tab-button ${activeTab === 'presentacion' ? 'active' : ''}`}
              >
                Presentación 30%
              </button>
              <button 
                onClick={() => setActiveTab('sustentacion')}
                className={`tab-button ${activeTab === 'sustentacion' ? 'active' : ''}`}
              >
                Sustentación 30%
              </button>
              <button 
                onClick={() => setActiveTab('documentacion')}
                className={`tab-button ${activeTab === 'documentacion' ? 'active' : ''}`}
              >
                Documentación 30%
              </button>
              <button 
                onClick={() => setActiveTab('innovacion')}
                className={`tab-button ${activeTab === 'innovacion' ? 'active' : ''}`}
              >
                Innovación 10%
              </button>
            </div>
            
            {/* Contenido de la sección activa */}
            <div className="rubrica-content">
              {rubrica[activeTab] && renderSeccion(rubrica[activeTab])}
            </div>
        </div>
      </div>
    </div>
  );
};

export default VistaRubrica;