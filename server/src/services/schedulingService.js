/**
 * Scheduling Service - FR12: Schedule Lessons, Assignments, and Deadlines
 * Handles assignment creation, scheduling, and tracking
 */

import AssignmentModel from '../models/assignment.js';
import UserModel from '../models/user.js';
import * as notificationService from './notificationService.js';

class SchedulingService {
  /**
   * Create a new assignment
   * @param {string} teacherId - Teacher ID
   * @param {Object} assignmentData - Assignment details
   * @returns {Promise<Object>} Created assignment
   */
  async createAssignment(teacherId, assignmentData) {
    const { title, description, students, module, questions, dueDate, startDate, points } = assignmentData;

    const assignment = await AssignmentModel.create({
      title,
      description,
      teacher: teacherId,
      students: students || [],
      module,
      questions: questions || [],
      dueDate: new Date(dueDate),
      startDate: startDate ? new Date(startDate) : new Date(),
      points: points || 100,
      status: 'draft'
    });

    return assignment;
  }

  /**
   * Publish an assignment (makes it available to students)
   * @param {string} assignmentId - Assignment ID
   * @param {string} teacherId - Teacher ID
   * @returns {Promise<Object>} Updated assignment
   */
  async publishAssignment(assignmentId, teacherId) {
    const assignment = await AssignmentModel.findOneAndUpdate(
      { _id: assignmentId, teacher: teacherId },
      { status: 'published' },
      { new: true }
    ).populate('students', 'username email');

    if (assignment) {
      // Notify students
      for (const student of assignment.students) {
        notificationService.sendNotification(
          student._id.toString(),
          'assignment',
          `New assignment: ${assignment.title}`,
          `Due: ${assignment.dueDate.toLocaleDateString()}`
        );
      }
    }

    return assignment;
  }

  /**
   * Get assignments for a teacher
   * @param {string} teacherId - Teacher ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Assignments
   */
  async getTeacherAssignments(teacherId, filters = {}) {
    const query = { teacher: teacherId };
    
    if (filters.status) {
      query.status = filters.status;
    }

    const assignments = await AssignmentModel.find(query)
      .populate('students', 'username email')
      .populate('module', 'title skill level')
      .sort({ dueDate: 1 });

    return assignments;
  }

  /**
   * Get assignments for a student
   * @param {string} studentId - Student ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Assignments
   */
  async getStudentAssignments(studentId, filters = {}) {
    const query = {
      students: studentId,
      status: 'published'
    };

    if (filters.status === 'upcoming') {
      query.dueDate = { $gte: new Date() };
    } else if (filters.status === 'overdue') {
      query.dueDate = { $lt: new Date() };
      query['submissions.student'] = { $ne: studentId };
    }

    const assignments = await AssignmentModel.find(query)
      .populate('teacher', 'username email')
      .populate('module', 'title skill level')
      .sort({ dueDate: 1 });

    // Add completion status
    return assignments.map(assignment => {
      const submission = assignment.submissions.find(
        s => s.student && s.student.toString() === studentId
      );
      
      return {
        ...assignment.toObject(),
        completed: !!submission,
        score: submission?.score,
        submittedAt: submission?.submittedAt
      };
    });
  }

  /**
   * Submit assignment
   * @param {string} assignmentId - Assignment ID
   * @param {string} studentId - Student ID
   * @param {number} score - Score achieved
   * @returns {Promise<Object>} Updated assignment
   */
  async submitAssignment(assignmentId, studentId, score) {
    const assignment = await AssignmentModel.findById(assignmentId);
    
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Check if already submitted
    const existingSubmission = assignment.submissions.find(
      s => s.student && s.student.toString() === studentId
    );

    if (existingSubmission) {
      throw new Error('Assignment already submitted');
    }

    // Add submission
    assignment.submissions.push({
      student: studentId,
      submittedAt: new Date(),
      score,
      completed: true
    });

    await assignment.save();

    // Notify teacher
    notificationService.sendNotification(
      assignment.teacher.toString(),
      'assignment',
      `Assignment submitted: ${assignment.title}`,
      `Student submitted assignment with score: ${score}`
    );

    return assignment;
  }

  /**
   * Update assignment
   * @param {string} assignmentId - Assignment ID
   * @param {string} teacherId - Teacher ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated assignment
   */
  async updateAssignment(assignmentId, teacherId, updates) {
    const assignment = await AssignmentModel.findOneAndUpdate(
      { _id: assignmentId, teacher: teacherId },
      updates,
      { new: true }
    );

    return assignment;
  }

  /**
   * Delete assignment
   * @param {string} assignmentId - Assignment ID
   * @param {string} teacherId - Teacher ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteAssignment(assignmentId, teacherId) {
    const result = await AssignmentModel.deleteOne({
      _id: assignmentId,
      teacher: teacherId
    });

    return result.deletedCount > 0;
  }

  /**
   * Get assignment calendar view
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Calendar events
   */
  async getCalendar(userId, role, startDate, endDate) {
    let query = {};

    if (role === 'teacher') {
      query.teacher = userId;
    } else {
      query.students = userId;
      query.status = 'published';
    }

    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const assignments = await AssignmentModel.find(query)
      .populate('module', 'title')
      .sort({ dueDate: 1 });

    return assignments.map(a => ({
      id: a._id,
      title: a.title,
      description: a.description,
      start: a.startDate,
      end: a.dueDate,
      module: a.module?.title,
      status: a.status,
      points: a.points
    }));
  }
}

export default new SchedulingService();
