require('dotenv').config(); // carga las variables de entorno
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// importar rutas
const docenteRoute = require('./routes/docente_routes');
const gruposRoute = require('./routes/grupos_routes');
const estudiantesRoute = require('./routes/estudiantes_routes');
const calificacionRoute = require('./routes/calificaciones_routes');
const rubricaRoute = require('./routes/rubrica_route');
const informeRoute = require('./routes/informe_route');
const borradoresRoute = require('./routes/borradores_routes');
const supervisorRoute = require('./routes/supervisor_routes');
class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;

    this.middlewares();
    this.routes();
    this.errorHandlers();
  }

  middlewares() {
    this.app.use(helmet()); 
    this.app.use(cors({

      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    this.app.use(compression());
    this.app.use(morgan('combined')); // ver mas detalles del log
    this.app.use(express.json({
      limit: '10mb' // limites del tamaños de solicitudes json
    }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  routes() {
    this.app.use('/api/borradores', borradoresRoute);
    this.app.use('/api/docentes', docenteRoute);
    this.app.use('/api/grupos', gruposRoute);
    this.app.use('/api/estudiantes', estudiantesRoute);
    this.app.use('/api/calificaciones', calificacionRoute);
    this.app.use('/api/rubricas', rubricaRoute);
    this.app.use('/api/informe', informeRoute);
    this.app.use('/api/supervisores', supervisorRoute);
    this.app.use('/api/adm', supervisorRoute);

    // Ruta de prueba
    this.app.get('/', (req, res) => {
      res.json({ 
        message: 'Servidor Backend Funcionando', 
        status: 'OK' 
      });
    });
  }

  errorHandlers() {
    this.app.use((req, res, next) => {
      res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.path 
      });
    });

    // manejar errores globales
    this.app.use((err, req, res, next) => {
      console.error('Error global:', err);
      res.status(err.status || 500).json({
        error: 'Error interno del servidor',
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });
  }

  start() {
    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`Servidor corriendo en puerto ${this.port}`);
      console.log(`Escuchando en todas las interfaces de red (0.0.0.0)`);
      console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
    });
  }
}

const server = new Server();
server.start();

module.exports = server;