# Esquema de la base de datos — VetCareHub

Documentación visual del esquema PostgreSQL (Neon) de **VetCareHub** en formato Mermaid.  
Se renderiza directamente en GitHub y en la vista previa de Markdown de VS Code.

> Fuente equivalente para [dbdiagram.io](https://dbdiagram.io): [`db/esquema.dbml`](./esquema.dbml).  
> Las tablas del sistema se aplican con `pnpm db:migrar` (`db/migraciones/`) y las de autenticación con Better Auth.

## Diagrama entidad-relación

```mermaid
erDiagram
    proveedores ||--o{ inventario : "provee (on delete set null)"
    user ||--o{ mascotas : "tiene (on delete cascade)"
    mascotas ||--o{ citas : "agenda (on delete cascade)"
    user ||--o{ session : "mantiene"
    user ||--o{ account : "autentica"

    proveedores {
        uuid id PK "gen_random_uuid()"
        text nombre UK "not null"
        text razon_social
        text rfc "12 o 13 caracteres en mayusculas"
        text contacto "Representante del laboratorio o distribuidor"
        text telefono
        text correo
        text direccion
        text ciudad
        text estado
        text codigo_postal "5 digitos"
        integer dias_credito "not null, default 0"
        text sitio_web
        timestamptz creado_en "not null"
        timestamptz actualizado_en "not null"
    }

    inventario {
        uuid id PK "gen_random_uuid()"
        text nombre "not null"
        text categoria "medicamento, vacuna, material, alimento o higiene"
        text unidad "not null, default pieza"
        integer cantidad "not null, >= 0"
        integer stock_minimo "not null, alerta por agotarse"
        numeric precio "numeric(10,2), not null"
        date caducidad
        uuid proveedor_id FK "nullable"
        boolean activo "not null, default true"
        timestamptz creado_en "not null"
        timestamptz actualizado_en "not null"
    }

    mascotas {
        uuid id PK "gen_random_uuid()"
        text cliente_id FK "not null -> user.id"
        text nombre "not null"
        text especie "perro, gato, ave, roedor, reptil u otro"
        text raza
        date nacimiento
        text notas "Alergias, caracter, observaciones"
        timestamptz creado_en "not null"
        timestamptz actualizado_en "not null"
    }

    citas {
        uuid id PK "gen_random_uuid()"
        uuid mascota_id FK "not null -> mascotas.id"
        date fecha "not null"
        time hora "09:00 a 18:30 cada 30 min"
        text servicio "20 servicios de catalogoServicios"
        text motivo
        text estado "pendiente, confirmada, completada o cancelada"
        timestamptz creado_en "not null"
        timestamptz actualizado_en "not null"
    }

    migraciones {
        text nombre PK "Archivo SQL en db/migraciones"
        timestamptz aplicada_en "not null"
    }

    user {
        text id PK
        text name "not null"
        text email UK "not null"
        boolean emailVerified "not null"
        text image
        text role "gerencia, jefatura, personal o cliente"
        text puesto "Puesto del organigrama"
        text telefono "Solo clientes"
        timestamptz terminos_aceptados_en "Primera aceptacion del cliente"
        boolean banned
        text banReason
        timestamptz banExpires
        timestamptz createdAt "not null"
        timestamptz updatedAt "not null"
    }

    session {
        text id PK
        text userId FK "not null -> user.id"
        text token UK "not null"
        timestamptz expiresAt "not null"
        text ipAddress
        text userAgent
        text impersonatedBy
        timestamptz createdAt "not null"
        timestamptz updatedAt "not null"
    }

    account {
        text id PK
        text userId FK "not null -> user.id"
        text accountId "not null"
        text providerId "credential para correo y contrasena"
        text password "Hash de la contrasena"
        text accessToken
        text refreshToken
        text idToken
        timestamptz accessTokenExpiresAt
        timestamptz refreshTokenExpiresAt
        text scope
        timestamptz createdAt "not null"
        timestamptz updatedAt "not null"
    }

    verification {
        text id PK
        text identifier "not null"
        text value "not null"
        timestamptz expiresAt "not null"
        timestamptz createdAt "not null"
        timestamptz updatedAt "not null"
    }

    rateLimit {
        text id PK
        text key UK "not null"
        integer count "not null"
        bigint lastRequest "not null"
    }
```

## Restricciones e índices destacados

- **`citas_horario_unico`**: índice único parcial en `(fecha, hora) WHERE estado <> 'cancelada'`.
- **`citas_hora_check`**: `hora BETWEEN '09:00' AND '18:30'` en bloques de 30 minutos (`00` y `30`).
- **Índices de llaves foráneas**: `inventario_proveedor_idx`, `mascotas_cliente_idx`, `citas_mascota_idx`, `session.userId`, `account.userId` y `verification.identifier`.
