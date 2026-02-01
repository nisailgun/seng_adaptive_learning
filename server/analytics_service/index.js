const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const analyticsService = require('./service');

const app = express();
const PORT = 8000; 

// Middleware (Enable CORS and JSON parsing)
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = 'mongodb://localhost:27017/learning_db';
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connection Successful"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- API ENDPOINTS ---

// Homepage Test Route
app.get('/', (req, res) => {
    res.json({ message: "Analytics Service (Node.js) Çalışıyor! 🚀" });
});

// Class Report Endpoint (JSON)
app.get('/api/reports/class/:classId', async (req, res) => {
    const classId = req.params.classId;
    
    try {
        const report = await analyticsService.getClassMetrics(classId);
        res.json({
            class_id: classId,
            data: report
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Class Average Endpoint (FR11 - JSON)
app.get('/api/reports/class/:classId/average', async (req, res) => {
    const classId = req.params.classId;
    try {
        // Call the new math function
        const stats = await analyticsService.calculateClassAverage(classId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------
// NEW ENDPOINT (FR14): Export PDF
// The "Download PDF" button in the Frontend triggers this request.
// ---------------------------------------------------------
app.get('/export/class/:classId', async (req, res) => {
    try {
        const classId = req.params.classId;
        
        // 1. Set Headers first
        // Tell the browser "A PDF file is coming" and force download.
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Class_${classId}_Report.pdf`);

        // 2. Call the Service and pass the 'res' object
        // The service will write data directly to this 'res' stream (Pipe).
        await analyticsService.generateClassReportPDF(classId, res);

    } catch (error) {
        console.error("PDF Error:", error);
        // If headers are already sent, we cannot send a status code, so just log.
        if (!res.headersSent) {
            res.status(500).send("Report generation failed");
        }
    }
});
// Start the Server
app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}`);
});