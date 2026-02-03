const { Student, StudentProgress } = require('./models');
const systemLogger = require('./logger'); // Imported Logger
const PDFDocument = require('pdfkit');

class AnalyticsService {

    // Main Flow from Diagram: getClassMetrics
    async getClassMetrics(classId) {
        console.log(`Fetching data for Class ID: ${classId}...`);

        // --- CRITICAL CONNECTION (DIAGRAM RULE) ---
        // "Spawn a new task/thread": In Node.js, we call this WITHOUT 'await'.
        // This ensures logging runs in the background while the code immediately proceeds (to DB).
        // Non-blocking operation.
        systemLogger.logAccessAsync("Teacher_101", `Viewed Dashboard for Class ${classId}`);

        // 1. Fetch all students
        const students = await Student.find({});
        
        const reportData = [];

        // --- FOCUS ON THE LOOP (DIAGRAM RULE) ---
        // "For each student" box
        for (const student of students) {
            
            // Fetch data
            const progress = await StudentProgress.findOne({ student_id: student._id });
            
            // Call "calculatePerformanceMetrics" method (Specific Logic)
            const metrics = this.calculatePerformanceMetrics(student, progress);

            reportData.push(metrics);
        }

        return reportData;
    }

    // --- SPECIFIC LOGIC (DIAGRAM RULE) ---
    // Calculation logic is isolated here
    calculatePerformanceMetrics(student, progress) {
        // Assume 0.0 if no record exists
        const retention = progress ? progress.retention_score : 0.0;
        
        // Risk Logic: Below 50% is considered risky
        const isRisky = retention < 50.0;

        return {
            id: student._id,
            name: student.name,
            level: student.current_level,
            retention: retention,
            risk: isRisky
        };
    }

    // CLASS AVERAGE
    async calculateClassAverage(classId) {
        const allProgress = await StudentProgress.find({});
        if (allProgress.length === 0) return { average_retention: 0, student_count: 0 };
        const totalScore = allProgress.reduce((sum, record) => sum + record.retention_score, 0);
        const average = totalScore / allProgress.length;
        
        return {
            class_id: classId,
            average_retention: parseFloat(average.toFixed(1)),
            student_count: allProgress.length
        };
    }
    async generateClassReportPDF(classId, res) { // <-- NOTICE: 'res' parameter added
        // 1. Pull data
        const data = await this.getClassMetrics(classId);
        
        // 2. Create PDF Document
        const doc = new PDFDocument();

        // 3. FIRST CONTACT (Pipe)
        //Before we start writing the data, we tell you where to go.
        doc.pipe(res);

        // 4. Write Content
        doc.fontSize(20).text(`Class ${classId} Performance Report`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();

        // Table Titles
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Student Name', 50, 150);
        doc.text('Level', 200, 150);
        doc.text('Retention Score', 300, 150);
        doc.text('Risk Status', 440, 150);
        
        doc.moveTo(50, 165).lineTo(550, 165).stroke();

        // List Students
        let y = 180;
        doc.font('Helvetica');
        
        data.forEach(student => {
            doc.text(student.name, 50, y);
            doc.text(student.level, 250, y);
            doc.text(`${student.retention}%`, 350, y);

            if (student.risk) {
                doc.fillColor('red').text('RISK', 480, y);
            } else {
                doc.fillColor('green').text('Stable', 480, y);
            }
            
            doc.fillColor('black');
            y += 30;
        });

        // 5. TRANSACTION FINISH (End)
        doc.end(); 
    }
}


module.exports = new AnalyticsService();