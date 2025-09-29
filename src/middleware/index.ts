import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

export const setupMiddleware = (app: Express): void => {
  // Security Middleware
  app.use(helmet());

const allowedOrigins = [
  "http://localhost:8080",
  "capacitor://localhost",
  "ionic://localhost",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "https://bolt.new",
  "http://localhost:3000",
  "https://real-finance-font-end-nfpu.vercel.app",
  "http://192.168.1.142:3000",
  "https://rfid-attendance-synctuario-theta.vercel.app",
  "https://super-admin-drab.vercel.app",
  "https://rfid-attendancesystem-backend-project.onrender.com",
  "https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--96435430.local-credentialless.webcontainer-api.io",
  // ✅ ADD THIS
];



app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      // No origin (native apps, curl, server-to-server)
      return callback(null, true);
    }

    // ✅ Always allow production + capacitor origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ✅ Allow localhost on http/https with any port
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // ✅ Allow 127.0.0.1 on http/https with any port
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // ✅ Allow LAN devices (192.168.x.x and 10.x.x.x ranges)
    if (
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    // ❌ Anything else is blocked
    console.warn("❌ Blocked by CORS:", origin);
    return callback(new Error("CORS not allowed for this origin"), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
  // Logging Middleware
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Body Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Global middleware to ensure req.body is always an object
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body === null || req.body === undefined) {
      req.body = {};
    }
    next();
  });

  // Validate request body for methods that require it
  app.use((req: Request, res: Response, next: NextFunction) => {
    const methodsRequiringBody = ['POST', 'PUT', 'PATCH'];

    if (methodsRequiringBody.includes(req.method) && !req.body) {
      return res.status(400).json({
        error: 'Request body is required for this operation',
      });
    }

    next();
  });
};
