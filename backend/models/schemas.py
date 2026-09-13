from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class ComponentScores(BaseModel):
    formatting: float
    keywords: float
    content: float
    skill_validation: float
    ats_compatibility: float

class JDComparison(BaseModel):
    match_percentage: float
    semantic_similarity: float
    matched_keywords: List[str]
    missing_keywords: List[str]
    skills_gap: List[str]

class SkillValidationDetails(BaseModel):
    validated: List[Dict[str, Any]] = []       # [{'skill': str, 'projects': [str]}]
    unvalidated: List[str] = []                # ['Flask', 'A/B Testing', ...]
    total: int = 0
    validated_count: int = 0
    validation_pct: float = 0.0

class IssueDetail(BaseModel):
    issue_title: str
    severity_level: str
    ats_impact: str
    explanation: str
    where_it_appears: str
    how_to_fix: str
    action_items: List[str] = []
    example_improvement: str

class AnalysisResponse(BaseModel):
    ATS_score: float
    component_scores: ComponentScores
    issues_summary: List[str]
    detailed_feedback: List[IssueDetail]
    jd_match_analysis: Optional[JDComparison] = None
    skill_validation_details: Optional[SkillValidationDetails] = None

    ats_score: float
    keyword_match: float = 0.0
    missing_keywords: List[str] = []
    matched_keywords: List[str] = []
    suggestions: List[str] = []
    strengths: List[str] = []
    critical_issues: List[str] = []
    skills: List[str] = []
    jd_comparison: Optional[JDComparison] = None
    warnings: List[str] = []
    interpretation: str = ""


# ─────────────────────────────────────────────────────────────────
# New models for RadarDev roadmap + mock interview features
# ─────────────────────────────────────────────────────────────────

class CommunityCitation(BaseModel):
    """A single Reddit community excerpt attached to a roadmap node."""
    subreddit: str
    post_title: str
    author: str
    post_url: str
    upvotes: int
    excerpt: str                            # chunk_content truncated to ~300 chars
    relevance_score: int                    # 0-100 from distance formula
    consensus_tag: Optional[str] = None     # "Crucial" | "Interview Gotcha" | "Project Idea" | "Overhyped"


class FlowNodeData(BaseModel):
    """Data payload for a single React Flow skill node."""
    label: str
    duration_days: int
    difficulty: str                         # "Beginner" | "Intermediate" | "Advanced"
    project_task: str                       # Hands-on exercise description
    citations: List[CommunityCitation] = []
    status: str = "todo"                    # "todo" | "in_progress" | "done"


class FlowNode(BaseModel):
    id: str
    type: str = "skillNode"
    position: Dict[str, float]              # {"x": 100.0, "y": 200.0}
    data: FlowNodeData


class FlowEdge(BaseModel):
    id: str
    source: str
    target: str
    animated: bool = True
    type: str = "smoothstep"


class CompanyIntelligence(BaseModel):
    """Structured company-specific interview intelligence synthesized from Reddit data."""
    company_name: str
    difficulty_rating: str                     # "High" | "Medium" | "Low"
    interview_rounds: List[str] = []           # e.g. ["Online Assessment", "Technical Round 1", "System Design", "HR"]
    key_topics: List[str] = []                 # e.g. ["DSA & Algorithms", "System Design", "Concurrency", "Behavioral"]
    community_verdict: str                     # Synthesis of real candidates' experiences
    top_reddit_threads: List[CommunityCitation] = []
    salary_range_inr: Optional[str] = None     # e.g. "₹18-24 LPA" if mentioned
    success_tips: List[str] = []               # Actionable tips from developers who cleared the interview


class TrendingRole(BaseModel):
    """A high-demand tech role extracted from live Reddit discussions."""
    role_name: str
    category: str                              # "AI & Data" | "Cloud & DevOps" | "Full Stack" | "Security"
    demand_badge: str                          # "Surging 🔥" | "High Demand 📈" | "Steady 🛡️"
    why_trending: str                          # 1-2 sentence market synthesis from Reddit
    key_skills: List[str] = []                 # Top technologies tested
    recommended_timeline_days: int = 45        # Recommended prep duration
    sample_hiring_companies: List[str] = []    # Companies actively hiring for this
    source_subreddits: List[str] = []


class TrendingRolesResponse(BaseModel):
    trending_roles: List[TrendingRole]
    discovered_at: str = "Live Reddit Market Signal"


class TimelineRecommendationRequest(BaseModel):
    target_role: str
    background_description: str = ""
    hours_per_week: int = 10


class DynamicTimelineRecommendation(BaseModel):
    target_role: str
    user_background_summary: str
    sprint_days: int
    sprint_focus: str
    recommended_days: int
    recommended_focus: str
    mastery_days: int
    mastery_focus: str
    community_consensus_quote: str
    recommended_hours_per_week: int = 10
    source_subreddits: List[str] = []


class CompanyTierGroup(BaseModel):
    tier_level: str                            # "Tier 1" | "Tier 2" | "Tier 3"
    tier_title: str                            # Dynamic role-tailored title (e.g. "Tier 1: Global Product & Core Platform")
    role_specific_focus: str                   # What this tier actually tests for this specific role
    typical_package_range: Optional[str] = None
    companies: List[str] = []
    community_tips: List[str] = []


class RoleCompanyDiscoveryResponse(BaseModel):
    target_role: str
    tiers: List[CompanyTierGroup] = []
    source_reddit_threads: List[CommunityCitation] = []


class RoadmapRequest(BaseModel):
    """Request body for POST /api/v1/roadmap/generate"""
    target_role: str
    experience_level: str = "beginner"      # "beginner" | "intermediate" | "advanced"
    timeline_days: int = 30
    hours_per_week: int = 10
    known_skills: List[str] = []
    target_company_tier: str = "Any"
    resume_text: str = ""
    skills_gap: List[str] = []
    background_description: str = ""
    target_company: str = ""                # e.g. "Google", "TCS", "Amazon" (dynamic search)
    preparation_goal: str = "job"           # "job" | "interview" | "upskill"


class DailyTopic(BaseModel):
    day_number: int
    weekday: Optional[str] = "Mon"
    title: str
    estimated_hours: float = 2.0
    key_concepts: List[str] = []
    practice_task: str = ""


class CommunityGotcha(BaseModel):
    topic: str
    warning: str
    source_subreddit: str = "r/developersIndia"


class CapstoneProject(BaseModel):
    title: str
    description: str
    key_technologies: List[str] = []
    difficulty: str = "Intermediate"


class WeeklyPlan(BaseModel):
    week_number: int
    theme: str
    focus_milestone: str
    goal: str
    days: List[DailyTopic] = []
    reddit_gotchas: List[CommunityGotcha] = []


class StudyPlan(BaseModel):
    executive_summary: str
    estimated_total_hours: int
    weekly_schedule: List[WeeklyPlan] = []
    capstone_projects: List[CapstoneProject] = []
    recommended_resources: List[str] = []


class RoadmapResponse(BaseModel):
    """Response body for POST /api/v1/roadmap/generate"""
    roadmap_id: str
    target_role: str
    total_nodes: int
    total_weeks: float
    nodes: List[FlowNode]
    edges: List[FlowEdge]
    community_backing: bool
    study_plan: Optional[StudyPlan] = None
    discovered_subreddits: List[str] = []
    parsed_background_summary: Optional[str] = None
    company_intelligence: Optional[CompanyIntelligence] = None


class MockQuestionsRequest(BaseModel):
    """Request body for POST /api/v1/mock/questions"""
    milestone_label: str
    difficulty: str = "Beginner"
    target_role: Optional[str] = None
    syllabus_context: Optional[str] = None


class MockQuestion(BaseModel):
    id: str
    text: str
    type: str = "conceptual"                # "conceptual" | "practical" | "debugging" | "scenario"
    tested_concept: Optional[str] = None
    difficulty: Optional[str] = "Beginner"


class MockQuestionsResponse(BaseModel):
    milestone_label: str
    questions: List[MockQuestion]


class MockAnswer(BaseModel):
    question_id: str
    answer: str


class MockQuestionEvaluation(BaseModel):
    question_id: str
    question_text: str
    question_type: str = "conceptual"
    tested_concept: Optional[str] = None
    user_answer: str = ""
    ideal_answer: str = ""
    score: float = 0.0                      # 0-100
    verdict: str = "Adequate"               # "Strong" | "Adequate" | "Needs Review" | "Critical Gap"
    strengths: List[str] = []
    missing_points: List[str] = []
    feedback: str = ""
    action_items: List[str] = []


class MockActionItem(BaseModel):
    id: str
    topic: str
    severity: str = "Medium"                # "High" | "Medium" | "Low"
    action_text: str
    recommended_study_day: Optional[str] = None


class MockEvaluateRequest(BaseModel):
    """Request body for POST /api/v1/mock/evaluate"""
    milestone_id: str
    milestone_label: str
    answers: List[MockAnswer]
    difficulty: Optional[str] = "Beginner"
    target_role: Optional[str] = None
    syllabus_context: Optional[str] = None


class MockEvaluateResponse(BaseModel):
    readiness_score: float                  # 0-100
    overall_verdict: str                    # "Strong" | "Needs Review" | "Critical Gap"
    identified_weaknesses: List[str]
    remedial_roadmap: Optional[RoadmapResponse] = None
    # Rich Diagnostic Fields matching Resume Report
    executive_summary: Optional[str] = None
    category_scores: Dict[str, float] = {}  # e.g. {"conceptual": 85.0, "practical": 70.0, "debugging": 60.0, "communication": 80.0}
    detailed_questions: List[MockQuestionEvaluation] = []
    action_checklist: List[MockActionItem] = []
    strengths: List[str] = []
    critical_gaps: List[str] = []


