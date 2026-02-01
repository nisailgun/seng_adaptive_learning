import UserModel from '../models/user.js';
import ModuleModel from '../models/module.js';
import QuestionModel from '../models/question.js';
import ResponseModel from '../models/response.js';

/**
 * Initial Path Generation Service
 * Generates personalized learning paths based on user's diagnostic scores and current ability (theta)
 */

// Map theta to CEFR-style levels
function thetaToLevel(theta) {
  if (theta < -1.5) return 0; // Pre-A1 / Diagnostic
  if (theta < -0.5) return 1; // A1 Foundations
  if (theta < 0.5) return 2;  // A2 Elementary
  if (theta < 1.5) return 3;  // B1 Intermediate
  if (theta < 2.5) return 4;  // B2 Upper-Intermediate
  return 5;                   // C1-C2 Advanced
}

// Calculate expected probability of correct answer (IRT 2PL model)
function expectedCorrectness(theta, difficulty, discrimination = 1) {
  return 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
}

// Calculate module fit score based on user ability
function calculateModuleFit(module, userTheta) {
  const items = module.items || [];
  if (items.length === 0) return 0;

  // Average difficulty of module items
  const avgDifficulty = items.reduce((sum, item) => sum + (item.difficulty || 0), 0) / items.length;
  
  // Ideal difficulty is slightly above theta (zone of proximal development)
  const idealDifficulty = userTheta + 0.3;
  
  // Score based on how close module difficulty is to ideal
  const difficultyGap = Math.abs(avgDifficulty - idealDifficulty);
  const fitScore = 100 * Math.exp(-difficultyGap);
  
  return fitScore;
}

// Generate skill-specific recommendations
function generateSkillRecommendations(modules, userTheta, skill) {
  const skillModules = modules.filter(m => m.skill === skill);
  const targetLevel = thetaToLevel(userTheta);
  
  return skillModules
    .map(module => ({
      ...module,
      fitScore: calculateModuleFit(module, userTheta),
      levelGap: Math.abs(module.level - targetLevel)
    }))
    .sort((a, b) => {
      // Prioritize by fit score, then by level proximity
      if (Math.abs(a.fitScore - b.fitScore) > 5) {
        return b.fitScore - a.fitScore;
      }
      return a.levelGap - b.levelGap;
    })
    .slice(0, 5); // Top 5 modules per skill
}

/**
 * Generate initial learning path for a new user
 * @param {string} userId - User ID
 * @param {Object} options - Optional parameters for path generation
 * @returns {Object} Generated learning path with modules and recommendations
 */
export async function generateInitialPath(userId, options = {}) {
  const {
    externalScores = null, // { reading: 0, writing: 0, listening: 0, speaking: 0 }
    includeOnboarding = true,
    targetSkills = ['reading', 'writing', 'listening', 'speaking']
  } = options;

  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  let initialTheta = user.theta || 0;

  // If external diagnostic scores provided, update user's initial theta
  if (externalScores) {
    const avgScore = (
      (externalScores.reading || 0) +
      (externalScores.writing || 0) +
      (externalScores.listening || 0) +
      (externalScores.speaking || 0)
    ) / 4;
    
    // Map average score (0-100) to theta scale (-3 to 3)
    initialTheta = (avgScore / 100) * 6 - 3;
    user.theta = initialTheta;
    await user.save();
  }

  // Load all modules
  const modules = await ModuleModel.find().lean();
  
  // Check if modules exist
  if (modules.length === 0) {
    throw new Error('No learning modules found in database. Please visit http://localhost:4000/api/seed to initialize the database, then try again.');
  }
  
  // Generate recommendations by skill
  const pathBySkill = {};
  for (const skill of targetSkills) {
    pathBySkill[skill] = generateSkillRecommendations(modules, initialTheta, skill);
  }

  // Create prioritized module sequence
  const prioritizedModules = [];
  
  // Add onboarding module if needed
  if (includeOnboarding && initialTheta < -1) {
    const onboarding = modules.find(m => m.level === 0 && m.skill === 'reading');
    if (onboarding) {
      prioritizedModules.push({
        ...onboarding,
        priority: 'high',
        reason: 'Onboarding & Diagnostic'
      });
    }
  }

  // Interleave modules from different skills for balanced learning
  const maxModulesPerSkill = 3;
  for (let i = 0; i < maxModulesPerSkill; i++) {
    for (const skill of targetSkills) {
      if (pathBySkill[skill][i]) {
        prioritizedModules.push({
          ...pathBySkill[skill][i],
          priority: i === 0 ? 'high' : 'medium',
          reason: i === 0 ? 'Best fit for current level' : 'Skill development'
        });
      }
    }
  }

  // Generate initial assessment schedule
  const assessmentSchedule = generateAssessmentSchedule(initialTheta);

  return {
    userId,
    generatedAt: new Date(),
    userTheta: initialTheta,
    suggestedLevel: thetaToLevel(initialTheta),
    modules: prioritizedModules,
    pathBySkill,
    assessmentSchedule,
    recommendations: {
      focusAreas: identifyFocusAreas(initialTheta, modules),
      estimatedDuration: estimatePathDuration(prioritizedModules),
      nextSteps: generateNextSteps(initialTheta)
    }
  };
}

/**
 * Regenerate path based on recent performance
 */
export async function regeneratePath(userId) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  // Get recent responses (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentResponses = await ResponseModel.find({
    user: userId,
    timestamp: { $gte: thirtyDaysAgo }
  }).lean();

  // Analyze performance by skill if we have skill-tagged questions
  const performance = analyzePerformance(recentResponses);

  // Generate updated path
  return generateInitialPath(userId, {
    includeOnboarding: false,
    targetSkills: performance.weakSkills.length > 0 
      ? performance.weakSkills 
      : ['reading', 'writing', 'listening', 'speaking']
  });
}

// Helper: Generate assessment schedule
function generateAssessmentSchedule(theta) {
  const level = thetaToLevel(theta);
  
  return {
    diagnostic: {
      recommended: level === 0 || level === 1,
      frequency: 'once',
      purpose: 'Establish baseline ability'
    },
    formative: {
      frequency: level <= 2 ? 'every 3 modules' : 'every 5 modules',
      purpose: 'Track ongoing progress and adjust path'
    },
    summative: {
      frequency: 'every 2 weeks',
      purpose: 'Validate skill mastery'
    }
  };
}

// Helper: Identify focus areas based on performance
function identifyFocusAreas(theta, modules) {
  const level = thetaToLevel(theta);
  const areas = [];

  if (theta < 0) {
    areas.push({
      skill: 'reading',
      topic: 'Basic vocabulary and comprehension',
      priority: 'high'
    });
    areas.push({
      skill: 'listening',
      topic: 'Simple conversations and instructions',
      priority: 'high'
    });
  } else if (theta < 1) {
    areas.push({
      skill: 'writing',
      topic: 'Sentence structure and grammar',
      priority: 'medium'
    });
    areas.push({
      skill: 'speaking',
      topic: 'Pronunciation and basic dialogue',
      priority: 'medium'
    });
  } else {
    areas.push({
      skill: 'reading',
      topic: 'Complex texts and inference',
      priority: 'medium'
    });
    areas.push({
      skill: 'writing',
      topic: 'Essay structure and argumentation',
      priority: 'high'
    });
  }

  return areas;
}

// Helper: Estimate total duration
function estimatePathDuration(modules) {
  const totalMinutes = modules.reduce((sum, m) => {
    // Assume 15-20 minutes per module on average
    const moduleTime = (m.items?.length || 3) * 5;
    return sum + moduleTime;
  }, 0);

  return {
    totalMinutes,
    hours: Math.round(totalMinutes / 60),
    weeks: Math.ceil(totalMinutes / (60 * 5)) // Assuming 5 hours/week
  };
}

// Helper: Generate next steps
function generateNextSteps(theta) {
  const level = thetaToLevel(theta);
  const steps = [];

  if (level === 0) {
    steps.push('Complete diagnostic assessment to establish your baseline');
    steps.push('Start with foundational reading modules');
    steps.push('Practice daily for 15-20 minutes');
  } else if (level <= 2) {
    steps.push('Focus on building core vocabulary and grammar');
    steps.push('Complete 2-3 modules per week');
    steps.push('Review challenging topics using spaced repetition');
  } else {
    steps.push('Tackle intermediate and advanced materials');
    steps.push('Focus on writing and speaking skills');
    steps.push('Engage with authentic content (articles, videos)');
  }

  return steps;
}

// Helper: Analyze recent performance
function analyzePerformance(responses) {
  if (responses.length === 0) {
    return { weakSkills: [], strongSkills: [], avgCorrectness: 0 };
  }

  const correctCount = responses.filter(r => r.correct).length;
  const avgCorrectness = correctCount / responses.length;

  // TODO: Analyze by skill when questions have skill tags
  return {
    weakSkills: avgCorrectness < 0.6 ? ['reading', 'writing'] : [],
    strongSkills: avgCorrectness > 0.8 ? ['reading', 'listening'] : [],
    avgCorrectness
  };
}

/**
 * Check if user needs initial path generation
 */
export async function needsInitialPath(userId) {
  const responses = await ResponseModel.find({ user: userId }).limit(1);
  return responses.length === 0;
}

/**
 * Update path based on module completion
 */
export async function updatePathOnCompletion(userId, moduleId) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  // Check if significant progress has been made (every 5 modules)
  const completedModules = await ResponseModel.distinct('question', { user: userId });
  
  if (completedModules.length % 5 === 0) {
    return regeneratePath(userId);
  }

  return null; // No update needed yet
}
