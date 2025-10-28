-- Agregar los nuevos campos a la tabla users
-- Ejecutar este SQL en PostgreSQL para agregar remember_token, email_verified_at y email_verification_token

ALTER TABLE users 
ADD COLUMN remember_token VARCHAR(100) NULL,
ADD COLUMN email_verified_at TIMESTAMP NULL,
ADD COLUMN email_verification_token VARCHAR(100) NULL;

-- Crear índices para optimizar búsquedas
CREATE INDEX idx_users_remember_token ON users(remember_token);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);

-- Marcar el usuario admin como verificado (opcional)
UPDATE users SET email_verified_at = NOW() WHERE email = 'admin@edificio.com';

-- Verificar los cambios
SELECT id, email, email_verified_at, remember_token, email_verification_token 
FROM users 
LIMIT 5;