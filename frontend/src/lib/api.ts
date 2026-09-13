// ============================================================
// RadarDev API Client — all typed fetch wrappers
// ============================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Type Definitions ──────────────────────────────────────────

export interface CommunityCitation {
  subreddit: string;
  post_title: string;
  author: string;
  post_url: string;
  upvotes: number;
  excerpt: string;
  relevance_score: number;
  consensus_tag?: string | null;
}

export interface FlowNodeData {
  label: string;
  duration_days: number;
  difficulty: string;
  project_task: string;
  citations: CommunityCitation[];
  status: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  type: string;
}

export interface DailyTopic {
  day_number: number;
  weekday?: string;
  title: string;
  estimated_hours: number;
  key_concepts: string[];
  practice_task: string;
}

export interface CommunityGotcha {
  topic: string;
  warning: string;
  source_subreddit: string;
}

export interface CapstoneProject {
  title: string;
  description: string;
  key_technologies: string[];
  difficulty: string;
}

export interface WeeklyPlan {
  week_number: number;
  theme: string;
  focus_milestone: string;
  goal: string;
  days: DailyTopic[];
  reddit_gotchas: CommunityGotcha[];
}

export interface StudyPlan {
  executive_summary: string;
  estimated_total_hours: number;
  weekly_schedule: WeeklyPlan[];
  capstone_projects: CapstoneProject[];
  recommended_resources: string[];
}

export interface CompanyIntelligence {
  company_name: string;
  difficulty_rating: string;
  interview_rounds: string[];
  key_topics: string[];
  community_verdict: string;
  top_reddit_threads: CommunityCitation[];
  salary_range_inr?: string | null;
  success_tips: string[];
}

export interface TrendingRole {
  role_name: string;
  category: string;
  demand_badge: string;
  why_trending: string;
  key_skills: string[];
  recommended_timeline_days: number;
  sample_hiring_companies: string[];
  source_subreddits: string[];
}

export interface TrendingRolesResponse {
  trending_roles: TrendingRole[];
  discovered_at: string;
}

export interface DynamicTimelineRecommendation {
  target_role: string;
  user_background_summary: string;
  sprint_days: number;
  sprint_focus: string;
  recommended_days: number;
  recommended_focus: string;
  mastery_days: number;
  mastery_focus: string;
  community_consensus_quote: string;
  recommended_hours_per_week: number;
  source_subreddits: string[];
}

export interface CompanyTierGroup {
  tier_level: string;
  tier_title: string;
  role_specific_focus: string;
  typical_package_range?: string | null;
  companies: string[];
  community_tips: string[];
}

export interface RoleCompanyDiscoveryResponse {
  target_role: string;
  tiers: CompanyTierGroup[];
  source_reddit_threads: CommunityCitation[];
}

export interface RoadmapRequest {
  target_role: string;
  experience_level?: string;
  timeline_days?: number;
  hours_per_week?: number;
  known_skills?: string[];
  target_company_tier?: string;
  resume_text?: string;
  skills_gap?: string[];
  background_description?: string;
  target_company?: string;
  preparation_goal?: string;
}

export interface RoadmapResponse {
  roadmap_id: string;
  target_role: string;
  total_nodes: number;
  total_weeks: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
  community_backing: boolean;
  study_plan?: StudyPlan;
  discovered_subreddits?: string[];
  parsed_background_summary?: string;
  company_intelligence?: CompanyIntelligence | null;
}

export interface MockQuestion {
  id: string;
  text: string;
  type: string;
  tested_concept?: string;
  difficulty?: string;
}

export interface MockQuestionsResponse {
  milestone_label: string;
  questions: MockQuestion[];
}

export interface MockAnswer {
  question_id: string;
  answer: string;
}

export interface MockQuestionEvaluation {
  question_id: string;
  question_text: string;
  question_type: string;
  tested_concept?: string;
  user_answer: string;
  ideal_answer: string;
  score: number;
  verdict: 'Strong' | 'Adequate' | 'Needs Review' | 'Critical Gap' | string;
  strengths: string[];
  missing_points: string[];
  feedback: string;
  action_items: string[];
}

export interface MockActionItem {
  id: string;
  topic: string;
  severity: 'High' | 'Medium' | 'Low' | string;
  action_text: string;
  recommended_study_day?: string;
}

export interface MockEvaluateResponse {
  readiness_score: number;
  overall_verdict: string;
  identified_weaknesses: string[];
  remedial_roadmap?: RoadmapResponse | null;
  executive_summary?: string;
  category_scores?: Record<string, number>;
  detailed_questions?: MockQuestionEvaluation[];
  action_checklist?: MockActionItem[];
  strengths?: string[];
  critical_gaps?: string[];
}

export interface ATSComponentScores {
  formatting: number;
  keywords: number;
  content: number;
  skill_validation: number;
  ats_compatibility: number;
}

export interface IssueDetail {
  issue_title: string;
  severity_level: 'High' | 'Medium' | 'Low' | string;
  ats_impact: 'High' | 'Medium' | 'Low' | string;
  explanation: string;
  where_it_appears: string;
  how_to_fix: string;
  action_items: string[];
  example_improvement?: string;
}

export interface SkillValidationDetails {
  validated: Array<{ skill: string; projects: string[] }>;
  unvalidated: string[];
  total: number;
  validated_count: number;
  validation_pct: number;
}

export interface ATSAnalysisResponse {
  ATS_score: number;
  ats_score: number;
  component_scores: ATSComponentScores;
  issues_summary: string[];
  detailed_feedback?: IssueDetail[];
  skill_validation_details?: SkillValidationDetails | null;
  strengths?: string[];
  suggestions?: string[];
  critical_issues?: string[];
  missing_keywords: string[];
  matched_keywords: string[];
  skills: string[];
  interpretation: string;
  jd_comparison?: {
    match_percentage: number;
    semantic_similarity?: number;
    matched_keywords?: string[];
    missing_keywords: string[];
    skills_gap: string[];
  } | null;
}

export interface ResearchProgressEvent {
  type: 'progress' | 'complete' | 'error';
  step?: string;
  percent?: number;
  title?: string;
  detail?: string;
  subreddits?: string[];
  sample_quotes?: Array<{ sub: string; title: string; snippet: string }>;
  result?: RoadmapResponse;
  message?: string;
}

const DEFAULT_HEADERS: Record<string, string> = {
  'ngrok-skip-browser-warning': 'true',
};

// ── API Functions ─────────────────────────────────────────────

export async function getTrendingRoles(): Promise<TrendingRolesResponse> {
  const res = await fetch(`${API_URL}/api/v1/roadmap/trending-roles`, {
    headers: { ...DEFAULT_HEADERS },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to fetch trending roles');
  }
  return res.json();
}

export async function recommendTimeline(
  targetRole: string,
  backgroundDescription: string = '',
  hoursPerWeek: number = 10
): Promise<DynamicTimelineRecommendation> {
  const res = await fetch(`${API_URL}/api/v1/roadmap/recommend-timeline`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_role: targetRole,
      background_description: backgroundDescription,
      hours_per_week: hoursPerWeek,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to calculate timeline recommendation');
  }
  return res.json();
}

export async function getHiringCompanies(role: string): Promise<RoleCompanyDiscoveryResponse> {
  const res = await fetch(`${API_URL}/api/v1/roadmap/hiring-companies?role=${encodeURIComponent(role)}`, {
    headers: { ...DEFAULT_HEADERS },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to fetch hiring companies');
  }
  return res.json();
}

export async function generateRoadmap(req: RoadmapRequest): Promise<RoadmapResponse> {
  const res = await fetch(`${API_URL}/api/v1/roadmap/generate`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Roadmap generation failed');
  }
  return res.json();
}

/**
 * Stream roadmap generation using Server-Sent Events (SSE)
 * to receive live research updates in real time.
 */
export async function generateRoadmapStream(
  req: RoadmapRequest,
  onEvent: (event: ResearchProgressEvent) => void
): Promise<RoadmapResponse> {
  try {
    const res = await fetch(`${API_URL}/api/v1/roadmap/generate-stream`, {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!res.ok || !res.body) {
      // Fallback to standard non-streaming generate
      return await generateRoadmap(req);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let finalResult: RoadmapResponse | null = null;
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const line = block.trim();
        if (line.startsWith('data:')) {
          const raw = line.slice(5).trim();
          try {
            const evt: ResearchProgressEvent = JSON.parse(raw);
            onEvent(evt);
            if (evt.type === 'complete' && evt.result) {
              finalResult = evt.result;
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }

    if (finalResult) {
      return finalResult;
    }
  } catch (streamErr) {
    console.warn('Streaming error, falling back to standard endpoint:', streamErr);
  }

  // Fallback if stream was interrupted without final result
  return await generateRoadmap(req);
}

export async function getRoadmap(roadmapId: string): Promise<RoadmapResponse> {
  const res = await fetch(`${API_URL}/api/v1/roadmap/${roadmapId}`, {
    headers: { ...DEFAULT_HEADERS },
  });
  if (!res.ok) throw new Error(`Roadmap not found: ${roadmapId}`);
  return res.json();
}

export async function getMockQuestions(
  milestoneLabel: string,
  difficulty = 'Beginner',
  syllabusContext?: string,
  targetRole?: string
): Promise<MockQuestionsResponse> {
  const res = await fetch(`${API_URL}/api/v1/mock/questions`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      milestone_label: milestoneLabel,
      difficulty,
      syllabus_context: syllabusContext,
      target_role: targetRole,
    }),
  });
  if (!res.ok) throw new Error('Failed to load questions');
  return res.json();
}

export async function evaluateMockAnswers(
  milestoneId: string,
  milestoneLabel: string,
  answers: MockAnswer[],
  syllabusContext?: string,
  targetRole?: string,
  difficulty = 'Beginner'
): Promise<MockEvaluateResponse> {
  const res = await fetch(`${API_URL}/api/v1/mock/evaluate`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      milestone_id: milestoneId,
      milestone_label: milestoneLabel,
      answers,
      syllabus_context: syllabusContext,
      target_role: targetRole,
      difficulty,
    }),
  });
  if (!res.ok) throw new Error('Evaluation failed');
  return res.json();
}

export function generateMockSummaryText(result: MockEvaluateResponse, milestoneLabel: string): string {
  const lines: string[] = [
    '==================================================',
    ` RADARDEV TECHNICAL INTERVIEW EVALUATION REPORT `,
    '==================================================',
    `Milestone:       ${milestoneLabel}`,
    `Readiness Score: ${result.readiness_score}/100`,
    `Overall Verdict: ${result.overall_verdict}`,
    `Date Generated:  ${new Date().toLocaleDateString()}`,
    '',
    '--------------------------------------------------',
    ' EXECUTIVE SUMMARY',
    '--------------------------------------------------',
    result.executive_summary || 'No executive summary provided.',
    '',
  ];

  if (result.category_scores && Object.keys(result.category_scores).length > 0) {
    lines.push('--------------------------------------------------');
    lines.push(' CATEGORY SCORE BREAKDOWN');
    lines.push('--------------------------------------------------');
    Object.entries(result.category_scores).forEach(([cat, val]) => {
      lines.push(`${cat.toUpperCase().padEnd(16)}: ${val}%`);
    });
    lines.push('');
  }

  if (result.strengths && result.strengths.length > 0) {
    lines.push('--------------------------------------------------');
    lines.push(' TOP STRENGTHS');
    lines.push('--------------------------------------------------');
    result.strengths.forEach((s, idx) => lines.push(`${idx + 1}. [STRONG] ${s}`));
    lines.push('');
  }

  if (result.critical_gaps && result.critical_gaps.length > 0) {
    lines.push('--------------------------------------------------');
    lines.push(' CRITICAL GAPS & KNOWLEDGE DEFICITS');
    lines.push('--------------------------------------------------');
    result.critical_gaps.forEach((g, idx) => lines.push(`${idx + 1}. [GAP] ${g}`));
    lines.push('');
  }

  if (result.detailed_questions && result.detailed_questions.length > 0) {
    lines.push('--------------------------------------------------');
    lines.push(' QUESTION-BY-QUESTION DEEP DIVE');
    lines.push('--------------------------------------------------');
    result.detailed_questions.forEach((dq, idx) => {
      lines.push(`\n[Q${idx + 1}] (${dq.question_type.toUpperCase()}) Score: ${dq.score}/100 [${dq.verdict}]`);
      lines.push(`Question: ${dq.question_text}`);
      lines.push(`Candidate Answer:\n${dq.user_answer || '(No answer provided)'}`);
      lines.push(`Ideal Benchmark Answer:\n${dq.ideal_answer}`);
      if (dq.strengths && dq.strengths.length > 0) {
        lines.push(`What went well: ${dq.strengths.join(', ')}`);
      }
      if (dq.missing_points && dq.missing_points.length > 0) {
        lines.push(`What was missing: ${dq.missing_points.join(', ')}`);
      }
      if (dq.feedback) {
        lines.push(`Feedback: ${dq.feedback}`);
      }
    });
    lines.push('');
  }

  if (result.action_checklist && result.action_checklist.length > 0) {
    lines.push('--------------------------------------------------');
    lines.push(' ACTIONABLE REVISION CHECKLIST');
    lines.push('--------------------------------------------------');
    result.action_checklist.forEach((item, idx) => {
      const dayStr = item.recommended_study_day ? ` [${item.recommended_study_day}]` : '';
      lines.push(`[ ] (${item.severity}) ${item.topic}${dayStr}: ${item.action_text}`);
    });
    lines.push('');
  }

  lines.push('==================================================');
  lines.push(' Generated by RadarDev AI Career Co-Pilot');
  lines.push('==================================================');

  return lines.join('\n');
}

export async function analyzeResume(
  resumeFile: File,
  jobDescription = ''
): Promise<ATSAnalysisResponse> {
  const formData = new FormData();
  formData.append('resume', resumeFile);
  formData.append('job_description', jobDescription);

  const res = await fetch(`${API_URL}/api/v1/analyze-resume`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Resume analysis failed');
  }
  return res.json();
}

export async function checkHealth(): Promise<{ status: string; nlp_loaded: boolean; embedder_loaded: boolean }> {
  const res = await fetch(`${API_URL}/api/v1/health`, {
    headers: { ...DEFAULT_HEADERS },
  });
  if (!res.ok) throw new Error('Backend unavailable');
  return res.json();
}

/**
 * Generates human-readable plain text summary of the ATS analysis for download
 * matching the original ai-resume-ats export capability.
 */
export function generateSummaryText(ats: ATSAnalysisResponse): string {
  const score = Math.round(ats.ATS_score ?? ats.ats_score ?? 0);
  const lines: string[] = [
    '============================================================',
    '             RADARDEV ATS RESUME ANALYSIS REPORT            ',
    '============================================================',
    `Timestamp: ${new Date().toLocaleString()}`,
    `Overall ATS Score: ${score}/100`,
    `Verdict: ${score >= 75 ? 'Strong ATS Match' : score >= 50 ? 'Needs Optimization' : 'Critical Fixes Required'}`,
    `Interpretation: ${ats.interpretation || 'N/A'}`,
    '',
    '------------------------------------------------------------',
    'COMPONENT SCORES BREAKDOWN:',
    '------------------------------------------------------------',
    `  • Formatting:        ${ats.component_scores.formatting}/20`,
    `  • Keywords:          ${ats.component_scores.keywords}/25`,
    `  • Content Quality:   ${ats.component_scores.content}/25`,
    `  • Skill Validation:  ${ats.component_scores.skill_validation}/15`,
    `  • ATS Compatibility: ${ats.component_scores.ats_compatibility}/15`,
    '',
  ];

  if (ats.strengths && ats.strengths.length > 0) {
    lines.push('------------------------------------------------------------');
    lines.push('WHAT YOUR RESUME DOES WELL:');
    lines.push('------------------------------------------------------------');
    ats.strengths.forEach(s => lines.push(`  [✓] ${s}`));
    lines.push('');
  }

  if (ats.detailed_feedback && ats.detailed_feedback.length > 0) {
    lines.push('------------------------------------------------------------');
    lines.push('ACTIONABLE DIAGNOSTIC ISSUES & FIXES:');
    lines.push('------------------------------------------------------------');
    ats.detailed_feedback.forEach((issue, idx) => {
      lines.push(`${idx + 1}. [${issue.severity_level.toUpperCase()}] ${issue.issue_title}`);
      if (issue.where_it_appears) lines.push(`   Where: ${issue.where_it_appears}`);
      if (issue.explanation) lines.push(`   Details: ${issue.explanation}`);
      if (issue.how_to_fix) lines.push(`   Fix: ${issue.how_to_fix}`);
      if (issue.action_items && issue.action_items.length > 0) {
        lines.push('   Action Items:');
        issue.action_items.forEach(a => lines.push(`     - ${a}`));
      }
      if (issue.example_improvement) {
        lines.push('   Example Improvement:');
        lines.push(`     ${issue.example_improvement.replace(/\n/g, '\n     ')}`);
      }
      lines.push('');
    });
  } else if (ats.issues_summary && ats.issues_summary.length > 0) {
    lines.push('------------------------------------------------------------');
    lines.push('ISSUES DETECTED:');
    lines.push('------------------------------------------------------------');
    ats.issues_summary.forEach(iss => lines.push(`  [!] ${iss}`));
    lines.push('');
  }

  if (ats.critical_issues && ats.critical_issues.length > 0) {
    lines.push('------------------------------------------------------------');
    lines.push('CRITICAL ISSUES (Blocking ATS Filters):');
    lines.push('------------------------------------------------------------');
    ats.critical_issues.forEach(ci => lines.push(`  [🔴 CRITICAL] ${ci}`));
    lines.push('');
  }

  if (ats.suggestions && ats.suggestions.length > 0) {
    lines.push('------------------------------------------------------------');
    lines.push('PRIORITIZED IMPROVEMENT RECOMMENDATIONS:');
    lines.push('------------------------------------------------------------');
    ats.suggestions.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    lines.push('');
  }

  if (ats.skill_validation_details) {
    const sv = ats.skill_validation_details;
    lines.push('------------------------------------------------------------');
    lines.push('SKILL VALIDATION ANALYSIS:');
    lines.push('------------------------------------------------------------');
    lines.push(`  Verified Evidence Rate: ${sv.validation_pct || Math.round((sv.validated_count / (sv.total || 1)) * 100)}%`);
    if (sv.validated && sv.validated.length > 0) {
      lines.push(`  Validated Skills: ${sv.validated.map(v => v.skill).join(', ')}`);
    }
    if (sv.unvalidated && sv.unvalidated.length > 0) {
      lines.push(`  Unvalidated Skills (Lack Project Evidence): ${sv.unvalidated.join(', ')}`);
    }
    lines.push('');
  }

  if (ats.jd_comparison) {
    const jd = ats.jd_comparison;
    lines.push('------------------------------------------------------------');
    lines.push('JOB DESCRIPTION MATCH ANALYSIS:');
    lines.push('------------------------------------------------------------');
    lines.push(`  Match Score: ${jd.match_percentage}%`);
    if (jd.matched_keywords && jd.matched_keywords.length > 0) {
      lines.push(`  Matched Keywords: ${jd.matched_keywords.join(', ')}`);
    }
    if (jd.missing_keywords && jd.missing_keywords.length > 0) {
      lines.push(`  Missing Keywords: ${jd.missing_keywords.join(', ')}`);
    }
    if (jd.skills_gap && jd.skills_gap.length > 0) {
      lines.push(`  Skills Gap: ${jd.skills_gap.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('============================================================');
  lines.push('Generated by RadarDev — SkillBridge AI Platform');
  lines.push('============================================================');

  return lines.join('\n');
}

export function downloadTextFile(filename: string, content: string): void {
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
