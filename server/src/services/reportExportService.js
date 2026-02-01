/**
 * Report Export Service - FR13: Exportable Progress Reports (PDF/CSV)
 * Handles PDF and CSV generation for reports
 */

import UserModel from '../models/user.js';
import ResponseModel from '../models/response.js';
import QuestionModel from '../models/question.js';

class ReportExportService {
  /**
   * Generate student progress report data
   * @param {string} userId - Student ID
   * @returns {Promise<Object>} Report data
   */
  async generateStudentReport(userId) {
    const user = await UserModel.findById(userId).lean();
    if (!user) throw new Error('User not found');

    const responses = await ResponseModel.find({ user: userId })
      .populate('question')
      .lean();

    const totalQuestions = responses.length;
    const correctAnswers = responses.filter(r => r.correct).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions * 100).toFixed(2) : 0;

    // Group by skill
    const skillStats = {};
    responses.forEach(r => {
      const skill = r.question?.skill || 'unknown';
      if (!skillStats[skill]) {
        skillStats[skill] = { total: 0, correct: 0 };
      }
      skillStats[skill].total++;
      if (r.correct) skillStats[skill].correct++;
    });

    return {
      student: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        username: user.username,
        email: user.email,
        theta: user.theta.toFixed(2),
        level: this.thetaToLevel(user.theta)
      },
      summary: {
        totalQuestions,
        correctAnswers,
        accuracy: `${accuracy}%`,
        currentAbility: user.theta.toFixed(2)
      },
      skillBreakdown: Object.keys(skillStats).map(skill => ({
        skill,
        total: skillStats[skill].total,
        correct: skillStats[skill].correct,
        accuracy: ((skillStats[skill].correct / skillStats[skill].total) * 100).toFixed(2) + '%'
      })),
      recentActivity: responses.slice(-10).map(r => ({
        question: r.question?.text?.substring(0, 50) + '...' || 'N/A',
        skill: r.question?.skill || 'unknown',
        correct: r.correct ? 'Yes' : 'No',
        date: new Date(r.timestamp).toLocaleDateString()
      }))
    };
  }

  /**
   * Generate class report data (for teachers)
   * @param {Array} studentIds - Array of student IDs
   * @returns {Promise<Object>} Class report data
   */
  async generateClassReport(studentIds) {
    const students = await Promise.all(
      studentIds.map(async (id) => {
        try {
          return await this.generateStudentReport(id);
        } catch (e) {
          return null;
        }
      })
    );

    const validStudents = students.filter(s => s !== null);

    return {
      class: {
        totalStudents: validStudents.length,
        reportDate: new Date().toISOString(),
        averageAccuracy: (
          validStudents.reduce((sum, s) => sum + parseFloat(s.summary.accuracy), 0) / validStudents.length
        ).toFixed(2) + '%',
        averageTheta: (
          validStudents.reduce((sum, s) => sum + parseFloat(s.student.theta), 0) / validStudents.length
        ).toFixed(2)
      },
      students: validStudents.map(s => ({
        name: s.student.name,
        username: s.student.username,
        theta: s.student.theta,
        level: s.student.level,
        totalQuestions: s.summary.totalQuestions,
        accuracy: s.summary.accuracy
      }))
    };
  }

  /**
   * Convert report data to CSV format
   * @param {Object} reportData - Report data
   * @param {string} reportType - 'student' or 'class'
   * @returns {string} CSV string
   */
  toCSV(reportData, reportType = 'student') {
    if (reportType === 'student') {
      let csv = 'Student Progress Report\n\n';
      csv += `Name,${reportData.student.name}\n`;
      csv += `Username,${reportData.student.username}\n`;
      csv += `Email,${reportData.student.email}\n`;
      csv += `Ability Score (θ),${reportData.student.theta}\n`;
      csv += `Level,${reportData.student.level}\n\n`;

      csv += 'Summary\n';
      csv += `Total Questions,${reportData.summary.totalQuestions}\n`;
      csv += `Correct Answers,${reportData.summary.correctAnswers}\n`;
      csv += `Accuracy,${reportData.summary.accuracy}\n\n`;

      csv += 'Skill Breakdown\n';
      csv += 'Skill,Total,Correct,Accuracy\n';
      reportData.skillBreakdown.forEach(skill => {
        csv += `${skill.skill},${skill.total},${skill.correct},${skill.accuracy}\n`;
      });

      csv += '\nRecent Activity\n';
      csv += 'Question,Skill,Correct,Date\n';
      reportData.recentActivity.forEach(activity => {
        csv += `"${activity.question}",${activity.skill},${activity.correct},${activity.date}\n`;
      });

      return csv;
    } else if (reportType === 'class') {
      let csv = 'Class Progress Report\n\n';
      csv += `Report Date,${new Date(reportData.class.reportDate).toLocaleDateString()}\n`;
      csv += `Total Students,${reportData.class.totalStudents}\n`;
      csv += `Average Accuracy,${reportData.class.averageAccuracy}\n`;
      csv += `Average Ability (θ),${reportData.class.averageTheta}\n\n`;

      csv += 'Student Details\n';
      csv += 'Name,Username,Ability (θ),Level,Total Questions,Accuracy\n';
      reportData.students.forEach(student => {
        csv += `${student.name},${student.username},${student.theta},${student.level},${student.totalQuestions},${student.accuracy}\n`;
      });

      return csv;
    }
  }

  /**
   * Convert theta to level name
   * @param {number} theta - Ability score
   * @returns {string} Level name
   */
  thetaToLevel(theta) {
    if (theta < -1) return 'Beginner';
    if (theta < 0) return 'Elementary';
    if (theta < 1) return 'Intermediate';
    if (theta < 2) return 'Advanced';
    return 'Expert';
  }
}

export default new ReportExportService();
