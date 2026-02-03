# Analytics Service

A separate Node.js service for advanced analytics and reporting (runs on port 8000).

## Purpose

This service provides:
- Class-level metrics and averages
- Student performance tracking
- Risk detection and alerts
- Async security logging (FR15)

## Running the Service

```bash
cd server/analytics_service
node index.js
```

The service will start on `http://localhost:8000`

## API Endpoints

### `GET /api/reports/class/:classId`
Returns class metrics including student performance data.

### `GET /api/reports/class/:classId/average`
Returns class average retention and student count.

## Integration

The TeacherDashboard (`client/src/pages/TeacherDashboard.jsx`) attempts to fetch data from this service. If the service is not running, it gracefully falls back to showing only the main application data.

## Note

This is an **optional** service. The main application (port 4000) works independently without it.
