-- Crear tabla de categorías de tickets
CREATE TABLE IF NOT EXISTS ticket_categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías por defecto (solo si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ticket_categorias WHERE nombre = 'Mantenimiento') THEN
        INSERT INTO ticket_categorias (nombre, descripcion) VALUES
            ('Mantenimiento', 'Problemas de mantenimiento general del edificio'),
            ('Plomería', 'Fugas, obstrucciones y problemas de agua'),
            ('Electricidad', 'Problemas eléctricos, apagones, cortocircuitos'),
            ('Limpieza', 'Solicitudes de limpieza de áreas comunes'),
            ('Seguridad', 'Problemas de seguridad y accesos'),
            ('Ascensor', 'Mantenimiento y reparación de ascensores'),
            ('Aire Acondicionado', 'Problemas de climatización'),
            ('Otro', 'Otras categorías no especificadas');
    END IF;
END $$;

-- Crear tabla de tickets
CREATE TABLE IF NOT EXISTS tickets (
    id_ticket SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_progreso', 'resuelto', 'cerrado', 'cancelado')),
    prioridad VARCHAR(10) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
    visibilidad VARCHAR(10) DEFAULT 'normal' CHECK (visibilidad IN ('normal', 'urgente', 'privado')),
    id_categoria INTEGER REFERENCES ticket_categorias(id_categoria) ON DELETE SET NULL,
    id_residente INTEGER REFERENCES residentes(id_residente) ON DELETE CASCADE,
    id_departamento INTEGER REFERENCES departamentos(id_departamento) ON DELETE CASCADE,
    fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_compromiso TIMESTAMP,
    fecha_cierre TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de adjuntos de tickets
CREATE TABLE IF NOT EXISTS ticket_adjuntos (
    id_adjunto SERIAL PRIMARY KEY,
    id_ticket INTEGER REFERENCES tickets(id_ticket) ON DELETE CASCADE,
    nombre_original VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    peso_bytes INTEGER NOT NULL,
    subido_por_persona INTEGER REFERENCES personas(id_persona) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de técnicos externos (opcional)
CREATE TABLE IF NOT EXISTS tecnicos_externos (
    id_tecnico SERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    especialidad VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    empresa VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridad ON tickets(prioridad);
CREATE INDEX IF NOT EXISTS idx_tickets_residente ON tickets(id_residente);
CREATE INDEX IF NOT EXISTS idx_tickets_departamento ON tickets(id_departamento);
CREATE INDEX IF NOT EXISTS idx_tickets_categoria ON tickets(id_categoria);
CREATE INDEX IF NOT EXISTS idx_tickets_codigo ON tickets(codigo);
CREATE INDEX IF NOT EXISTS idx_adjuntos_ticket ON ticket_adjuntos(id_ticket);
