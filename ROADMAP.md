# Presupuesto Familiar 2026 — Roadmap

App web para la Familia Servin que reemplaza el Excel de presupuesto.  
Stack: Next.js 14 · Supabase · Vercel · Gemini Flash · Evolution API (WhatsApp)

---

## ✅ Fase 1 — Base (completado)

### Infraestructura
- [x] Proyecto Next.js 14 App Router + TypeScript + Tailwind
- [x] Supabase PostgreSQL (proyecto `bndzfgmfozmkcumaouvy`, São Paulo)
- [x] Deploy automático en Vercel desde GitHub (`mariamiska/presupuesto-familiar`)
- [x] Variables de entorno: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`

### Base de datos
- [x] Tablas: `personas`, `conceptos`, `gastos`, `ingresos`, `presupuesto`
- [x] RLS activo — server components usan `supabaseAdmin()` (service role)
- [x] Fix cache Next.js 14: `supabaseAdmin()` usa `cache: 'no-store'` en fetch
- [x] Columnas `cuota_actual` y `cuotas_total` en `gastos`

### Páginas
- [x] **Dashboard** (`/`) — ingresos, gastos, balance, semáforo 5%, gastos por persona, gráfico anual
- [x] **Gastos** (`/gastos`) — tabla mensual, formulario manual, badge de cuota, modal edición de cuota
- [x] **Reportes** (`/reportes`) — tabla anual ingresos vs gastos reales por mes
- [x] **Simular** (`/simular`) — calculadora interactiva de ahorro
- [x] **Subir factura** (`/facturas`) — OCR con Gemini Flash, guarda gasto
- [x] **Importar Excel** (`/importar`) — lee Presupuesto 2026.xlsx y carga todo

### Import desde Excel
- [x] Hoja **Resumen Anual** → tabla `ingresos`
- [x] Hoja **Datos** tipo=Ingreso → tabla `presupuesto`
- [x] Hoja **Datos** tipo=Gasto → tabla `gastos` (gastos fijos recurrentes, con cuota)
- [x] Hoja **Gastos Reales** → tabla `gastos` (gastos variables)
- [x] Parseo de columna `Cuota` (ej: "25/60") → `cuota_actual` / `cuotas_total`

---

## 🔄 Fase 2 — Deudas (siguiente)

### Objetivo
Panel de deudas con seguimiento de amortización para créditos activos de la familia.

### Deudas conocidas (del Excel)
| Deuda | Persona | Cuota/Total | Estado |
|-------|---------|-------------|--------|
| Préstamo Auto | Augusto | 25/60 | Activa |
| FPJ | Augusto | pendiente | Activa |
| Crédito Universitario | ? | 31/60 | Activa |
| Préstamo Brasil | ? | pendiente | Activa |
| GNB | ? | pendiente | Activa |
| Tarjeta Conti | ? | pendiente | Activa |

### Tareas
- [ ] Tabla `deudas` en Supabase: `nombre`, `persona_id`, `capital_inicial`, `saldo_actual`, `tasa_anual`, `cuota_mensual`, `cuotas_totales`, `cuotas_pagadas`, `fecha_inicio`
- [ ] Extender import para leer deudas del Excel (hoja Datos, tipo=Gasto con Cuota)
- [ ] Página `/deudas` con tarjetas por deuda: saldo, cuotas restantes, barra de progreso
- [ ] Vincular `gastos.concepto_id` → `deudas.id` (FK opcional)
- [ ] Proyección: cuándo se termina de pagar cada deuda

---

## 📱 Fase 3 — WhatsApp Bot

### Objetivo
Registrar gastos enviando una foto del ticket o escribiendo desde WhatsApp.

### Infraestructura
- [x] Evolution API desplegada en Railway (Online)
  - URL: `https://evolution-api-production-[id].railway.app`
  - Redis + Postgres + API todos en estado Online
- [ ] Conectar número WhatsApp (escanear QR en Evolution API dashboard)
- [ ] Endpoint webhook `/api/whatsapp` en Next.js

### Tareas
- [ ] Crear endpoint `POST /api/whatsapp` que recibe eventos de Evolution API
- [ ] Detectar mensajes con imagen → OCR con Gemini Flash → guardar gasto
- [ ] Detectar mensajes de texto con formato "Gasto: [monto] [concepto]" → guardar directo
- [ ] Responder confirmación al usuario por WhatsApp
- [ ] Configurar webhook en Evolution API apuntando a Vercel
- [ ] Agregar `fuente: 'whatsapp'` al constraint de Supabase (ya está definido)

---

## 📊 Fase 4 — Mejoras de Dashboard

### Objetivo
Vista más rica con comparación presupuesto vs real.

### Tareas
- [ ] Tabla de conceptos: presupuesto planificado vs real ejecutado por categoría
- [ ] Alertas cuando un concepto supera el presupuesto
- [ ] Vista de tendencias: comparar mes actual vs mismo mes año anterior
- [ ] Export PDF/Excel del resumen mensual
- [ ] Notificaciones automáticas (ej: recordatorio de cuotas a vencer)

---

## 🔧 Deuda técnica

- [ ] Eliminar endpoint `/api/debug` (solo para desarrollo)
- [ ] Agregar autenticación (Supabase Auth) para proteger la app
- [ ] Tests básicos de los endpoints críticos (import, gastos)
- [ ] Manejo de errores más robusto en el import (log de filas saltadas)

---

## Notas técnicas

**Fix crítico Next.js cache**: `supabaseAdmin()` en `/src/lib/supabase.ts` usa `cache: 'no-store'` en el fetch global. Sin esto, Server Components sirven datos cacheados del build.

**Constraint gastos.fuente**: `CHECK (fuente IN ('manual', 'ocr', 'whatsapp', 'importar'))` — al agregar nuevas fuentes, correr `ALTER TABLE` en Supabase.

**Re-importar Excel**: borrar y recargar es seguro. Solo se borran registros con `fuente='importar'` y el año 2026. Los gastos manuales/OCR no se tocan.
